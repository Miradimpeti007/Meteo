# data — Pipeline & API Python

Ce module gère la récupération, le nettoyage, la jointure et l'exposition des données de qualité de l'air et météorologiques en France.

---

## Prérequis

- Python 3.12+
- pip

---

## Installation

Depuis la **racine du dépôt** (pas depuis `data/`) :

```bash
pip install -r data/requirements.txt
```

> Le module s'importe en tant que `data.*`, le working directory doit donc être la racine du projet.

---

## Structure

```
data/
├── api/
│   └── main.py            # Serveur FastAPI (endpoints HTTP)
├── src/
│   └── processing/
│       ├── pipeline.py        # Orchestrateur principal
│       ├── datagouv_client.py # Téléchargement depuis data.gouv.fr
│       ├── pollution_clean.py # Nettoyage données pollution
│       ├── synop_clean.py     # Nettoyage données météo SYNOP
│       ├── joins.py           # Jointures géo + temporelle
│       └── indice_pollution.py# Calcul de l'indice final
├── data/
│   ├── raw/               # Données brutes téléchargées
│   └── processed/         # Données traitées (df_joined.csv)
├── Dockerfile
└── requirements.txt
```

---

## Lancer l'API

### En local (sans Docker)

Depuis la **racine du dépôt** :

```bash
python -m uvicorn data.api.main:app --host 0.0.0.0 --port 8000 --reload
```

L'API est accessible sur `http://localhost:8000`.

### Avec Docker

Depuis la **racine du dépôt** :

```bash
docker build -f data/Dockerfile -t meteo-data-api .
docker run -p 8000:8000 meteo-data-api
```

---

## Endpoints

### `GET /health`
Vérifie que le service tourne.

```bash
curl http://localhost:8000/health
# {"ok": true}
```

### `GET /current`
Retourne les mesures de l'heure UTC la plus proche.

```bash
curl http://localhost:8000/current
```

Réponse :
```json
{
  "hour_utc": "2026-03-31 14:00:00",
  "rows": [
    { "nom": "Paris 1er", "lat": 48.8566, "lon": 2.3522, "hour_utc": "...", "Indice": 3.2 }
  ]
}
```

### `GET /data?start=...&end=...`
Retourne les données sur une période.

```bash
curl "http://localhost:8000/data?start=2026-03-01&end=2026-03-31"
```

Formats de date acceptés : `YYYY-MM-DD` ou `YYYY-MM-DDTHH:MM`.

---

## Lancer le pipeline manuellement

Pour traiter et sauvegarder les données sur une période, depuis la **racine du dépôt** :

```bash
python -m data.src.processing.pipeline --start 2026-03-01 --end 2026-03-31
```

Sans arguments, traite la journée du jour :

```bash
python -m data.src.processing.pipeline
```

---

## Flux de données

```
data.gouv.fr (INERIS + SYNOP)
        |
   datagouv_client.py   <- téléchargement
        |
pollution_clean.py + synop_clean.py   <- nettoyage
        |
      joins.py           <- jointure géographique & temporelle
        |
indice_pollution.py      <- calcul de l'indice (0-10)
        |
   build_df()            <- DataFrame final
        |
FastAPI /current  /data  <- exposition HTTP
```

---

## Données sources

| Source | Contenu |
|--------|---------|
| INERIS via data.gouv.fr | Concentrations de polluants atmosphériques réglementés (temps réel) |
| data.gouv.fr archive SYNOP | Données météorologiques des stations au sol (WMO) |
| `table_jonction.csv` | Table de correspondance stations pollution ↔ coordonnées géographiques |
