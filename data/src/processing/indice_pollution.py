import hashlib
import math
from dataclasses import dataclass
from sklearn.linear_model import LinearRegression
import pandas as pd



@dataclass(frozen=True)
class NormStats:
    mean_ff: float
    std_ff: float
    mean_pres: float
    std_pres: float
    mean_u: float
    std_u: float
    mean_t: float
    std_t: float


def _compute_norm_stats(df: pd.DataFrame) -> NormStats:
    cols = ["ff", "pres", "u", "t"]
    means: dict[str, float] = {}
    stds: dict[str, float] = {}
    for c in cols:
        s = pd.to_numeric(df[c], errors="coerce")
        m = float(s.mean(skipna=True)) if not s.empty else 0.0
        means[c] = m if not math.isnan(m) else 0.0
        v = float(s.var(skipna=True)) if not s.empty else 0.0
        stds[c] = math.sqrt(v) if v > 0 else 1.0
    return NormStats(
        mean_ff=means["ff"],
        std_ff=stds["ff"],
        mean_pres=means["pres"],
        std_pres=stds["pres"],
        mean_u=means["u"],
        std_u=stds["u"],
        mean_t=means["t"],
        std_t=stds["t"],
    )

def add_indice_final_column(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calcule un indice de pollution basé sur:
    - intensité de pollution (colonne 'valeur')
    - conditions météo (ff, pres, u, t)
    Sans aucune partie aléatoire.
    """
    required_cols = ["hour_utc", "lat_r", "lon_r", "ff", "pres", "u", "t", "valeur"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f"df_joined missing columns for indice calculation: {missing}")

    d = df.copy()

    # Typage
    d["hour_utc"] = pd.to_datetime(d["hour_utc"], errors="coerce", utc=False)
    for c in ["lat_r", "lon_r", "ff", "pres", "u", "t", "valeur"]:
        d[c] = pd.to_numeric(d[c], errors="coerce")

    # Stats globales météo (comme avant)
    stats = _compute_norm_stats(d)

    # Pollution : on z-score la colonne "valeur" puis on la scale 0–10
    val = d["valeur"]
    mu_val = float(val.mean(skipna=True)) if not val.empty else 0.0
    if math.isnan(mu_val):
        mu_val = 0.0
    std_val = float(val.std(skipna=True)) if not val.empty else 1.0
    if math.isnan(std_val) or std_val == 0:
        std_val = 1.0
    val_z = (val.fillna(mu_val) - mu_val) / std_val
    # tronque à [-3, 3] puis mappe sur [0, 10]
    val_z = val_z.clip(-3, 3)
    indice_pollution = ((val_z + 3) / 6.0) * 10.0

    # Normalisation météo (même style que l’API, mais sans random)
    def _n(series: pd.Series, mean: float, std: float) -> pd.Series:
        s = std if std != 0 else 1.0
        return (series.fillna(mean) - mean) / s

    ff_n = _n(d["ff"], stats.mean_ff, stats.std_ff)
    pres_n = _n(d["pres"], stats.mean_pres, stats.std_pres)
    u_n = _n(d["u"], stats.mean_u, stats.std_u)
    t_n = _n(d["t"], stats.mean_t, stats.std_t)

    # Facteur météo (même structure que dans l’API)
    facteur_meteo = 1.0 - 0.3 * ff_n + 0.2 * pres_n + 0.1 * u_n + 0.2 * t_n

    d["indice_final"] = (indice_pollution * facteur_meteo).clip(lower=0).round(3)
    return d

def add_regression_prediction(df: pd.DataFrame) -> pd.DataFrame:
    features = ["ff", "pres", "u", "t", "valeur"]
    target = "indice_final"

    d = df.copy()
    for c in features + [target]:
        d[c] = pd.to_numeric(d[c], errors="coerce")
    
    clean = d.dropna(subset=features + [target])

    if len(clean) < 2:
        # Pas assez de données pour une régression fiable
        d["indice_predicted"] = None
        return df

    x = clean[features].values
    y = clean[target].values

    model = LinearRegression()
    model.fit(x, y)

    X_full = d[features].fillna(0).values
    d["indice_predicted"] = model.predict(X_full).round(3)

    return d