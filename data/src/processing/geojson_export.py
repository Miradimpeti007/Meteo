import json
from typing import Any

import numpy as np
import pandas as pd


def export_features(
    df_in: pd.DataFrame,
    path_out: str,
    id_col: str,
    name_col: str,
    lon_col: str = "lon",
    lat_col: str = "lat",
    extra_props: dict[str, str] | None = None,
) -> list[dict[str, Any]]:
    extra_props = extra_props or {}

    d = df_in.copy()
    cols_needed = [c for c in [id_col, name_col, lon_col, lat_col] if c in d.columns]
    d = d[cols_needed + [c for c in extra_props.values() if c in d.columns]].drop_duplicates()

    features: list[dict[str, Any]] = []
    for _, r in d.iterrows():
        lon = r.get(lon_col, np.nan)
        lat = r.get(lat_col, np.nan)
        if pd.isna(lon) or pd.isna(lat):
            continue

        props: dict[str, Any] = {
            "Id": None
            if id_col not in d.columns
            else (None if pd.isna(r.get(id_col)) else str(r.get(id_col))),
            "Nom": None
            if name_col not in d.columns
            else (None if pd.isna(r.get(name_col)) else str(r.get(name_col))),
        }

        for out_key, src_col in extra_props.items():
            val = r.get(src_col, None)
            if pd.isna(val):
                val = None
            elif isinstance(val, (np.integer, np.floating)):
                val = float(val)
            props[out_key] = val

        features.append(
            {
                "type": "Feature",
                "properties": props,
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(lon), float(lat)],
                },
            }
        )

    with open(path_out, "w", encoding="utf-8") as f:
        json.dump(features, f, ensure_ascii=False, indent=2)

    return features

