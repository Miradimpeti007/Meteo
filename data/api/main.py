from __future__ import annotations

import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(__file__).resolve()
REPO_ROOT = ROOT.parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from data.src.processing.pipeline import build_df, fetch_current  # noqa: E402


def _parse_date(s: str) -> datetime:
    s = s.strip()
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    raise ValueError(f"Format non reconnu : {s}")


def _df_to_rows(df) -> list[dict[str, Any]]:
    cols = [c for c in ["nom site", "lat_r", "lon_r", "hour_utc", "indice_final", "indice_predicted"] if c in df.columns]
    return (
        df[cols]
        .rename(columns={"lat_r": "lat", "lon_r": "lon", "nom site": "nom", "indice_final": "Indice", "indice_predicted": "Indice Prédit"})
        .to_dict(orient="records")
    )


app = FastAPI(title="Challenge 48h API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True}


@app.get("/current")
def current(response: Response) -> dict[str, Any]:
    """Retourne les données de l'heure la plus proche de maintenant (UTC)."""
    try:
        df = fetch_current()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erreur pipeline: {e}") from e

    if df.empty:
        raise HTTPException(status_code=404, detail="Aucune donnée disponible.")

    rows = _df_to_rows(df)
    hour = str(df["hour_utc"].iloc[0])
    response.headers["X-Total-Count"] = str(len(rows))
    response.headers["X-Hour-UTC"] = hour
    return {"hour_utc": hour, "rows": rows}


@app.get("/data")
def data(
    start: str = Query(..., description="Date/heure de début (YYYY-MM-DD ou YYYY-MM-DDTHH:MM)"),
    end: str = Query(..., description="Date/heure de fin (YYYY-MM-DD ou YYYY-MM-DDTHH:MM)"),
    response: Response = None,
) -> dict[str, Any]:
    """Retourne les données pour une période. Accepte YYYY-MM-DD ou YYYY-MM-DDTHH:MM."""
    try:
        start_dt = _parse_date(start)
        end_dt = _parse_date(end)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Format invalide : {e}") from e

    try:
        df = build_df(start=start_dt.date(), end=end_dt.date())
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erreur pipeline: {e}") from e

    if df.empty:
        response.headers["X-Total-Count"] = "0"
        return {"start": start, "end": end, "rows": []}

    if start_dt.hour or start_dt.minute:
        df = df[pd.to_datetime(df["hour_utc"]) >= pd.Timestamp(start_dt)]
    if end_dt.hour or end_dt.minute:
        df = df[pd.to_datetime(df["hour_utc"]) <= pd.Timestamp(end_dt)]

    rows = _df_to_rows(df)
    response.headers["X-Total-Count"] = str(len(rows))
    response.headers["X-Start"] = start
    response.headers["X-End"] = end
    return {"start": start, "end": end, "rows": rows}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=os.getenv("HOST", "0.0.0.0"), port=int(os.getenv("PORT", "8000")))
