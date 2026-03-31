from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from io import BytesIO
import re

import pandas as pd
import requests


@dataclass
class DataGouvSettings:
    """
    Configuration minimale pour accéder aux données Data.gouv.

    Tu dois remplir ces champs avec tes valeurs (bucket, URLs) :
    - object_api_base_url : ex. \"https://object.delta.data.gouv.fr\"
    - object_bucket       : nom du bucket (ex. \"my-bucket\")
    - pollution_prefix    : préfixe des fichiers pollution E2 (ex. \"air/pollution/E2\")
    - synop_dataset_api_url : URL API du dataset SYNOP (ressources annuelles)
    - synop_stations_resource_url : URL JSON des stations SYNOP
    """

    object_api_base_url: str
    object_bucket: str
    pollution_prefix: str
    synop_dataset_api_url: str
    synop_stations_resource_url: str
    # optionnel : nombre de jours par défaut pour fetch_pollution_df
    pollution_days: int = 30


class DataGouvClient:
    def __init__(self, settings: DataGouvSettings) -> None:
        self.settings = settings
        self.timeout = 300
        self._synop_resource_cache: dict[int, str] = {}

    def _download_bytes(self, url: str) -> bytes:
        response = requests.get(url, timeout=self.timeout)
        response.raise_for_status()
        return response.content

    def _object_api_get(self, path: str, params: dict[str, str] | None = None) -> dict:
        base = self.settings.object_api_base_url.rstrip("/")
        url = f"{base}/{path.lstrip('/')}"
        response = requests.get(url, params=params, timeout=self.timeout)
        response.raise_for_status()
        return response.json()

    @staticmethod
    def _looks_like_gzip(content: bytes) -> bool:
        return len(content) >= 2 and content[0] == 0x1F and content[1] == 0x8B

    # --- Pollution E2 ---

    def fetch_pollution_df(self) -> pd.DataFrame:
        """
        Récupère la pollution E2 sur les N derniers jours (pollution_days).
        """
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=max(1, self.settings.pollution_days) - 1)
        return self.fetch_pollution_df_for_range(start_date=start_date, end_date=end_date)

    def fetch_pollution_df_for_range(self, start_date: date, end_date: date) -> pd.DataFrame:
        if start_date > end_date:
            raise ValueError("start_date doit être <= end_date")

        bucket = self.settings.object_bucket
        pattern = re.compile(r"FR_E2_(\d{4}-\d{2}-\d{2})\.csv$")
        csv_objects: list[tuple[str, str]] = []

        for year in range(start_date.year, end_date.year + 1):
            prefix = f"{self.settings.pollution_prefix.strip('/')}/{year}/"
            listing = self._object_api_get(
                f"buckets/{bucket}/objects",
                params={"prefix": prefix, "recursive": "true", "limit": "5000"},
            )
            objects = listing.get("objects", [])
            for obj in objects:
                name = str(obj.get("name", ""))
                match = pattern.search(name)
                if not match:
                    continue
                file_date = datetime.strptime(match.group(1), "%Y-%m-%d").date()
                if start_date <= file_date <= end_date:
                    csv_objects.append((name, match.group(1)))

        if not csv_objects:
            raise ValueError("Aucun fichier pollution CSV E2 trouvé via Data.gouv Object API")

        csv_objects.sort(key=lambda item: item[1])
        frames: list[pd.DataFrame] = []
        base = self.settings.object_api_base_url.rstrip("/")
        for object_name, _ in csv_objects:
            payload = self._download_bytes(
                f"{base}/buckets/{bucket}/objects/download?prefix={object_name}"
            )
            try:
                frame = pd.read_csv(
                    BytesIO(payload),
                    sep=";",
                    quotechar='"',
                    low_memory=False,
                    encoding="utf-8-sig",
                )
            except UnicodeDecodeError:
                frame = pd.read_csv(
                    BytesIO(payload),
                    sep=";",
                    quotechar='"',
                    low_memory=False,
                    encoding="latin-1",
                )
            frame["source_file"] = object_name.split("/")[-1]
            frames.append(frame)

        return pd.concat(frames, ignore_index=True)

    # --- SYNOP ---

    def _synop_resource_url_for_year(self, year: int) -> str:
        if year in self._synop_resource_cache:
            return self._synop_resource_cache[year]

        dataset_url = self.settings.synop_dataset_api_url
        response = requests.get(dataset_url, timeout=self.timeout)
        response.raise_for_status()
        dataset = response.json()

        target = f"synop_{year}"
        for resource in dataset.get("resources", []):
            title = str(resource.get("title", "")).strip().lower()
            if title == target:
                url = str(resource.get("latest") or resource.get("url") or "").strip()
                if not url:
                    break
                self._synop_resource_cache[year] = url
                return url

        raise ValueError(f"Ressource SYNOP introuvable pour l'année {year} sur Data.gouv")

    def fetch_synop_df(self, start_date: date, end_date: date) -> pd.DataFrame:
        if start_date > end_date:
            raise ValueError("start_date doit être <= end_date")

        frames: list[pd.DataFrame] = []
        for year in range(start_date.year, end_date.year + 1):
            url = self._synop_resource_url_for_year(year)
            content = self._download_bytes(url)
            compression = "gzip" if self._looks_like_gzip(content) else "infer"
            frame = pd.read_csv(
                BytesIO(content),
                sep=";",
                low_memory=False,
                compression=compression,
            )
            frames.append(frame)

        merged = pd.concat(frames, ignore_index=True)
        merged["validity_time"] = pd.to_datetime(merged["validity_time"], errors="coerce", utc=True)
        time_mask = (
            merged["validity_time"]
            >= pd.Timestamp(start_date).tz_localize("UTC") - pd.Timedelta(hours=3)
        ) & (
            merged["validity_time"]
            <= pd.Timestamp(end_date).tz_localize("UTC") + pd.Timedelta(days=1, hours=3)
        )
        return merged[time_mask].copy()

    def fetch_synop_stations_df(self) -> pd.DataFrame:
        content = self._download_bytes(self.settings.synop_stations_resource_url)
        return pd.read_json(BytesIO(content))


def fetch_current_month_pollution_and_synop(
    settings: DataGouvSettings,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Helper simple :
    - start_date = premier jour du mois courant
    - end_date   = aujourd'hui
    Renvoie (df_pollution, df_synop) directement prêts à être nettoyés.
    """
    today = date.today()
    start = today.replace(day=1)
    end = today
    return fetch_pollution_and_synop_for_range(settings=settings, start_date=start, end_date=end)


def fetch_pollution_and_synop_for_range(
    *,
    settings: DataGouvSettings,
    start_date: date,
    end_date: date,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Récupère pollution E2 + synop sur la plage [start_date, end_date] (bornes dates).
    """
    client = DataGouvClient(settings)
    poll = client.fetch_pollution_df_for_range(start_date=start_date, end_date=end_date)
    syn = client.fetch_synop_df(start_date=start_date, end_date=end_date)
    return poll, syn

