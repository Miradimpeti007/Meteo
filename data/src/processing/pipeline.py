from pathlib import Path
import argparse
from datetime import datetime, date, timedelta

import pandas as pd

from src.processing.datagouv_client import (
    DataGouvSettings,
    fetch_pollution_and_synop_for_range,
)
from src.processing.indice_pollution import add_indice_final_column
from src.processing.joins import geo_join_pollution_with_table, time_join_synop_pollution
from src.processing.pollution_clean import clean_pollution_df
from src.processing.synop_clean import clean_synop_df


ROOT = Path(__file__).resolve()
REPO_ROOT = ROOT.parents[3]

SETTINGS = DataGouvSettings(
    object_api_base_url="https://object.infra.data.gouv.fr/api/v1",
    object_bucket="ineris-prod",
    pollution_prefix="lcsqa/concentrations-de-polluants-atmospheriques-reglementes/temps-reel",
    synop_dataset_api_url="https://www.data.gouv.fr/api/1/datasets/archive-synop-omm/",
    synop_stations_resource_url="https://www.data.gouv.fr/api/1/datasets/r/d82625f7-091c-40c5-a4e7-313a2ba5d3ef",
    pollution_days=1,
)

TABLE_PATH = REPO_ROOT / "data" / "data" / "processed" / "table_jonction.csv"


def _parse_yyyy_mm_dd(s: str) -> date:
    return datetime.strptime(s.strip(), "%Y-%m-%d").date()


def build_df(start: date, end: date) -> pd.DataFrame:
    """Fetch + clean + join + indice pour une plage de dates. Retourne le DataFrame."""
    df_pollution_raw, df_synop_raw = fetch_pollution_and_synop_for_range(
        settings=SETTINGS, start_date=start, end_date=end
    )

    df_synop = clean_synop_df(df_synop_raw)
    df_pollution = clean_pollution_df(df_pollution_raw)

    df_pollution = geo_join_pollution_with_table(df_pollution, str(TABLE_PATH))
    print("Geo join ok:", int(df_pollution["lat"].notna().sum()), "/", len(df_pollution))

    df_joined, df2_not_matched, df_syn_not_matched = time_join_synop_pollution(
        df_synop, df_pollution, lat_decimals=4
    )
    print("Time join ok:", len(df_joined), "/", len(df_joined) + len(df2_not_matched))
    print("df2_not_matched:", len(df2_not_matched))
    print("df_syn_not_matched:", len(df_syn_not_matched))

    if "valeur brute" in df_joined.columns:
        df_joined["valeur"] = df_joined["valeur"].fillna(df_joined["valeur brute"])

    df_joined = df_joined.dropna(subset=["valeur"])

    if df_joined.empty:
        return df_joined

    return add_indice_final_column(df_joined)


def fetch_current() -> pd.DataFrame:
    """
    Retourne les lignes de l'heure la plus proche de maintenant (UTC).
    Fetch uniquement aujourd'hui.
    """
    today = date.today()
    df = build_df(start=today, end=today)

    if df.empty:
        return df

    now = datetime.utcnow()
    closest_hour = min(
        df["hour_utc"].dropna().unique(),
        key=lambda h: abs((pd.Timestamp(h) - pd.Timestamp(now)).total_seconds()),
    )
    return df[df["hour_utc"] == closest_hour].copy()


def run_pipeline(start: str | None = None, end: str | None = None) -> None:
    start_date = _parse_yyyy_mm_dd(start) if start else date.today()
    end_date = _parse_yyyy_mm_dd(end) if end else date.today()

    df_joined = build_df(start=start_date, end=end_date)

    out_dir = REPO_ROOT / "data" / "data" / "processed"
    out_dir.mkdir(parents=True, exist_ok=True)
    # df_joined.to_csv(out_dir / "df_joined.csv", index=False, encoding="utf-8")
    # print("Saved to", out_dir / "df_joined.csv")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=str, default=None, help="YYYY-MM-DD")
    parser.add_argument("--end", type=str, default=None, help="YYYY-MM-DD")
    args = parser.parse_args()
    run_pipeline(start=args.start, end=args.end)
