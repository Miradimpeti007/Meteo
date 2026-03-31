import numpy as np
import pandas as pd

from .pollution_clean import _coerce_float_series


def geo_join_pollution_with_table(df2: pd.DataFrame, table_path: str) -> pd.DataFrame:
    df2 = df2.copy()
    df2 = df2.drop(columns=["lat", "lon"], errors="ignore")

    # table_jonction.csv (processed) est au format CSV standard (séparateur ',')
    df_geo = pd.read_csv(table_path)

    # On ignore une éventuelle première colonne d'index sans nom
    if df_geo.columns[0] == "":
        df_geo = df_geo.drop(columns=[df_geo.columns[0]])

    required_geo_cols = ["code site", "lat", "lon"]
    missing_geo_cols = [c for c in required_geo_cols if c not in df_geo.columns]
    if missing_geo_cols:
        raise ValueError(f"processed table_jonction.csv missing columns: {missing_geo_cols}")

    df_geo = df_geo[required_geo_cols].copy()
    df_geo["code site"] = (
        df_geo["code site"].where(df_geo["code site"].notna(), "").astype(str).str.strip()
    )
    df_geo["lat"] = _coerce_float_series(df_geo["lat"])
    df_geo["lon"] = _coerce_float_series(df_geo["lon"])

    df_geo_station = (
        df_geo.dropna(subset=["code site"])
        .groupby("code site")[["lat", "lon"]]
        .median()
        .reset_index()
    )

    if "code site" not in df2.columns:
        raise ValueError(
            "FR_E2 csv missing column 'code site' (clé de jointure avec table_jonction.csv)"
        )

    df2["code site"] = (
        df2["code site"].where(df2["code site"].notna(), "").astype(str).str.strip()
    )

    df2 = df2.merge(df_geo_station, on="code site", how="left")
    return df2


def time_join_synop_pollution(
    df_synop: pd.DataFrame,
    df_pollution: pd.DataFrame,
    *,
    lat_decimals: int = 4,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    LAT_DECIMALS = lat_decimals

    def _floor_hour_utc(dt_series: pd.Series) -> pd.Series:
        """
        Parse + floor à l'heure (UTC naive).
        Utile pour filtrer ensuite sur les multiples de 3h.
        """
        dt = pd.to_datetime(dt_series, errors="coerce")
        if hasattr(dt.dt, "tz_localize") and getattr(dt.dt, "tz", None) is not None:
            return dt.dt.tz_convert("UTC").dt.floor("h").dt.tz_localize(None)
        dt_utc = (
            dt.dt.tz_localize("Europe/Paris", ambiguous="infer", nonexistent="shift_forward")
            .dt.tz_convert("UTC")
        )
        return dt_utc.dt.floor("h").dt.tz_localize(None)

    df2 = df_pollution.copy()
    df_syn = df_synop.copy()

    # --- Aligne chaque site de pollution sur la station synop la plus proche ---
    # Objectif : réutiliser les coordonnées des stations synop (comme dans la version
    # précédente) pour que le time join trouve des correspondances.
    if {"code site", "lat", "lon"} <= set(df2.columns):
        sites_poll = (
            df2[["code site", "lat", "lon"]]
            .dropna(subset=["lat", "lon"])
            .drop_duplicates("code site")
        )
        sites_syn = (
            df_syn[["lat", "lon"]]
            .dropna(subset=["lat", "lon"])
            .drop_duplicates()
            .reset_index(drop=True)
        )

        if not sites_poll.empty and not sites_syn.empty:
            syn_coords = sites_syn[["lat", "lon"]].to_numpy(dtype=float)
            mapping_lat: dict[str, float] = {}
            mapping_lon: dict[str, float] = {}

            for _, row in sites_poll.iterrows():
                lat_p = float(row["lat"])
                lon_p = float(row["lon"])
                diff = syn_coords - np.array([lat_p, lon_p])
                dist2 = np.einsum("ij,ij->i", diff, diff)
                j = int(np.argmin(dist2))
                lat_s, lon_s = syn_coords[j]
                code = str(row["code site"])
                mapping_lat[code] = float(lat_s)
                mapping_lon[code] = float(lon_s)

            df2["code site"] = df2["code site"].astype(str)
            df2["lat"] = df2["code site"].map(mapping_lat)
            df2["lon"] = df2["code site"].map(mapping_lon)

    df2["lat_r"] = df2["lat"].round(LAT_DECIMALS)
    df2["lon_r"] = df2["lon"].round(LAT_DECIMALS)

    # Pollution: on garde uniquement les heures multiples de 3
    df2["hour_utc_hour"] = _floor_hour_utc(df2["Date de début"])
    df2 = df2[df2["hour_utc_hour"].dt.hour % 3 == 0].copy()
    df2["hour_utc"] = df2["hour_utc_hour"].dt.floor("3h")
    df2 = df2.drop(columns=["hour_utc_hour"], errors="ignore")

    df_syn["lat_r"] = df_syn["lat"].round(LAT_DECIMALS)
    df_syn["lon_r"] = df_syn["lon"].round(LAT_DECIMALS)
    df_syn["hour_utc"] = (
        pd.to_datetime(df_syn["reference_time"], errors="coerce", utc=True)
        .dt.floor("3h")
        .dt.tz_localize(None)
    )

    min_hour = df2["hour_utc"].min()
    max_hour = df2["hour_utc"].max()
    if pd.notna(min_hour) and pd.notna(max_hour):
        pad = pd.Timedelta(days=2)
        df_syn_sub = df_syn[df_syn["hour_utc"].between(min_hour - pad, max_hour + pad)].copy()
    else:
        df_syn_sub = df_syn

    keys = ["lat_r", "lon_r", "hour_utc"]
    df_syn_hourly = df_syn_sub.groupby(keys).mean(numeric_only=True).reset_index()

    meteo_cols = [c for c in df_syn_hourly.columns if c not in keys]
    df_out = df2.merge(
        df_syn_hourly[keys + meteo_cols],
        on=keys,
        how="left",
        suffixes=("", "_synop"),
    )

    matched_mask = df_out[meteo_cols].notna().any(axis=1)
    df_joined = df_out.loc[matched_mask].copy()
    df2_not_matched = df_out.loc[~matched_mask].copy()

    df2_keys_unique = df2[keys].dropna().drop_duplicates()
    df_syn_not_matched = (
        df_syn_hourly.merge(df2_keys_unique, on=keys, how="left", indicator=True)
        .query("_merge == 'left_only'")
        .drop(columns=["_merge"])
    )

    return df_joined, df2_not_matched, df_syn_not_matched

