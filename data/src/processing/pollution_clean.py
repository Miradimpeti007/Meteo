import numpy as np
import pandas as pd


def _coerce_float_series(s: pd.Series) -> pd.Series:
    if s is None:
        return s
    s2 = s
    if not pd.api.types.is_numeric_dtype(s2):
        s2 = (
            s2.astype(str)
            .str.strip()
            .replace(
                {
                    "": np.nan,
                    "NAN": np.nan,
                    "NA": np.nan,
                    "NULL": np.nan,
                    "NONE": np.nan,
                    "ND": np.nan,
                    "N/D": np.nan,
                    "N.A.": np.nan,
                    "N/A": np.nan,
                    "INFINI": np.nan,
                    "INF": np.nan,
                }
            )
            .str.replace("\u00a0", " ", regex=False)
            .str.replace(" ", "", regex=False)
            .str.replace(",", ".", regex=False)
        )
    return pd.to_numeric(s2, errors="coerce")


def _norm_unit(u) -> str | None:
    if u is None or (isinstance(u, float) and np.isnan(u)):
        return None
    s = str(u).strip().lower()
    s = s.replace("µ", "u")
    s = s.replace("m³", "m3").replace("m^3", "m3")
    s = pd.Series([s]).str.replace(r"\s+", "", regex=True).iloc[0]
    if s in {"ug/m3", "ugm3", "ug.m-3", "ug.m3", "ugm-3"}:
        return "ug/m3"
    if s in {"mg/m3", "mgm3", "mg.m-3", "mg.m3", "mgm-3"}:
        return "mg/m3"
    return None


def normalize_pollution_units_inplace(
    d: pd.DataFrame,
    *,
    value_col_candidates: tuple[str, ...] = ("valeur", "valeur brute", "value", "concentration"),
    unit_col_candidates: tuple[str, ...] = ("unité de mesure", "unite de mesure", "unité", "unite", "unit"),
    target_unit: str = "ug/m3",
) -> pd.DataFrame:
    if d is None or d.empty:
        return d

    cols_lower = {c.lower(): c for c in d.columns}
    value_col = next((cols_lower[c] for c in value_col_candidates if c in cols_lower), None)
    unit_col = next((cols_lower[c] for c in unit_col_candidates if c in cols_lower), None)
    if value_col is None or unit_col is None:
        return d

    target_unit_n = _norm_unit(target_unit) or target_unit
    unit_norm = d[unit_col].map(_norm_unit)
    values = _coerce_float_series(d[value_col])

    values = values.where(~values.isin([-999, -9999, -999.0, -9999.0, 9999, 9999.0]), np.nan)

    if target_unit_n == "ug/m3":
        values = np.where(unit_norm.eq("mg/m3"), values * 1000.0, values)
        unit_out = np.where(unit_norm.isna(), d[unit_col], "µg/m³")
    elif target_unit_n == "mg/m3":
        values = np.where(unit_norm.eq("ug/m3"), values / 1000.0, values)
        unit_out = np.where(unit_norm.isna(), d[unit_col], "mg/m³")
    else:
        return d

    d[value_col] = values
    d[unit_col] = unit_out
    return d


def clean_pollution_df(df2: pd.DataFrame) -> pd.DataFrame:
    df2 = df2.drop(
        columns=["taux de saisie", "couverture temporelle", "couverture de données"],
        errors="ignore",
    )

    df2 = df2.replace({"\u00a0": " "}, regex=True)
    df2 = normalize_pollution_units_inplace(df2, target_unit="ug/m3")

    for c in ["lat", "lon", "Date de début"]:
        if c in df2.columns and c in ("lat", "lon"):
            df2[c] = _coerce_float_series(df2[c])

    for c in ["nom site", "Zas"]:
        if c in df2.columns:
            df2[c] = df2[c].where(df2[c].notna(), "")

    return df2


def load_and_clean_pollution(path: str) -> pd.DataFrame:
    df2 = pd.read_csv(path, sep=";")
    return clean_pollution_df(df2)

