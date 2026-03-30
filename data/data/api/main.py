from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

import pandas as pd
from fastapi import FastAPI, HTTPException, Query


API_DIR = Path(__file__).resolve().parent
DEFAULT_CSV_PATH = (API_DIR / ".." / "processed" / "df.csv").resolve()

PLACE_ID_COL = "geo_id_wmo"
PLACE_NAME_COL = "name"
TIME_COL = "hour_utc"
LAT_COL = "lat"
LON_COL = "lon"


def _parse_dt(value: str) -> datetime:
    """
    Accepts:
    - ISO: 2026-03-29T22:00:00Z / 2026-03-29T22:00:00+00:00 / 2026-03-29 22:00:00
    Returns UTC-aware datetime floored to hour.
    """
    try:
        dt = pd.to_datetime(value, utc=True, errors="raise").to_pydatetime()
    except Exception as e:  # noqa: BLE001 - FastAPI error mapping
        raise HTTPException(status_code=422, detail=f"Invalid datetime: {value}") from e
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    dt_utc = dt.astimezone(timezone.utc)
    return dt_utc.replace(minute=0, second=0, microsecond=0)


def _load_df(csv_path: Path) -> pd.DataFrame:
    if not csv_path.exists():
        raise RuntimeError(f"CSV not found: {csv_path}")

    df = pd.read_csv(csv_path)
    missing = [c for c in [PLACE_ID_COL, PLACE_NAME_COL, TIME_COL, LAT_COL, LON_COL] if c not in df.columns]
    if missing:
        raise RuntimeError(f"CSV missing columns: {missing}")

    # Parse time column (stored as string like "2026-03-29 22:00:00")
    df = df.copy()
    df[TIME_COL] = pd.to_datetime(df[TIME_COL], errors="coerce", utc=True)
    df = df.dropna(subset=[TIME_COL, PLACE_ID_COL, PLACE_NAME_COL, LAT_COL, LON_COL])
    df[PLACE_ID_COL] = df[PLACE_ID_COL].astype(str)
    return df


app = FastAPI(title="Challenge 48h Data API", version="0.1.0")

_DF = _load_df(DEFAULT_CSV_PATH)
_FIELDS = sorted([c for c in _DF.columns if c not in {TIME_COL, PLACE_ID_COL, PLACE_NAME_COL, LAT_COL, LON_COL}])


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "rows": int(len(_DF)),
        "min_hour_utc": _DF[TIME_COL].min().isoformat(),
        "max_hour_utc": _DF[TIME_COL].max().isoformat(),
        "default_csv": str(DEFAULT_CSV_PATH),
    }


@app.get("/fields")
def fields() -> dict[str, Any]:
    return {"fields": _FIELDS}


@app.get("/data")
def get_data(
    at: str | None = Query(default=None, description="Datetime (ISO). Floored to hour."),
    start: str | None = Query(default=None, description="Start datetime (ISO). Floored to hour."),
    end: str | None = Query(default=None, description="End datetime (ISO). Floored to hour."),
    field: str = Query(default="t", description="Column to return per place (ex: t, ff, pmer, rr24)."),
    mode: Literal["first"] = Query(default="first", description="For a period, returns first element."),
) -> dict[str, Any]:
    if field not in _DF.columns:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown field '{field}'. Try /fields. (examples: {', '.join(_FIELDS[:10])})",
        )

    if at is None and (start is None or end is None):
        raise HTTPException(status_code=422, detail="Provide either 'at' OR ('start' AND 'end').")
    if at is not None and (start is not None or end is not None):
        raise HTTPException(status_code=422, detail="Provide only 'at' OR ('start' AND 'end'), not both.")

    if at is not None:
        ts = _parse_dt(at)
        mask = _DF[TIME_COL] == pd.Timestamp(ts)
        sub = _DF.loc[mask, [PLACE_ID_COL, PLACE_NAME_COL, LAT_COL, LON_COL, TIME_COL, field]].copy()
        if sub.empty:
            raise HTTPException(status_code=404, detail="No data for this datetime.")

        # one value per place (keep first row if duplicates)
        sub = sub.sort_values([PLACE_ID_COL]).groupby(PLACE_ID_COL, as_index=False).first()
        places = [
            {
                "id": r[PLACE_ID_COL],
                "name": r[PLACE_NAME_COL],
                "lat": float(r[LAT_COL]),
                "lon": float(r[LON_COL]),
                "ts": pd.Timestamp(r[TIME_COL]).to_pydatetime().replace(tzinfo=timezone.utc).isoformat(),
                "value": None if pd.isna(r[field]) else (float(r[field]) if _is_number(r[field]) else r[field]),
            }
            for _, r in sub.iterrows()
        ]
        return {"query": {"at": ts.isoformat(), "field": field}, "places": places}

    start_dt = _parse_dt(start)  # type: ignore[arg-type]
    end_dt = _parse_dt(end)  # type: ignore[arg-type]
    if end_dt < start_dt:
        raise HTTPException(status_code=422, detail="'end' must be >= 'start'.")

    mask = _DF[TIME_COL].between(pd.Timestamp(start_dt), pd.Timestamp(end_dt), inclusive="both")
    sub = _DF.loc[mask, [PLACE_ID_COL, PLACE_NAME_COL, LAT_COL, LON_COL, TIME_COL, field]].copy()
    if sub.empty:
        raise HTTPException(status_code=404, detail="No data for this period.")

    if mode == "first":
        # first element in the period per place
        sub = sub.sort_values([PLACE_ID_COL, TIME_COL]).groupby(PLACE_ID_COL, as_index=False).first()

    places = [
        {
            "id": r[PLACE_ID_COL],
            "name": r[PLACE_NAME_COL],
            "lat": float(r[LAT_COL]),
            "lon": float(r[LON_COL]),
            "ts": pd.Timestamp(r[TIME_COL]).to_pydatetime().replace(tzinfo=timezone.utc).isoformat(),
            "value": None if pd.isna(r[field]) else (float(r[field]) if _is_number(r[field]) else r[field]),
        }
        for _, r in sub.iterrows()
    ]
    return {
        "query": {"start": start_dt.isoformat(), "end": end_dt.isoformat(), "field": field, "mode": mode},
        "places": places,
    }


def _is_number(x: Any) -> bool:
    return isinstance(x, (int, float)) and not pd.isna(x)

