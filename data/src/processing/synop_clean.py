import pandas as pd


def clean_synop_df(df: pd.DataFrame) -> pd.DataFrame:
    # Phénomène spécial inutile
    df = df.drop(columns=["phenspe1", "phenspe2", "phenspe3", "phenspe4"], errors="ignore")

    # On garde que la hauteur de neige tt
    df = df.drop(columns=["perssfrai", "ssfrai"], errors="ignore")

    # On garde que les rafales sur les 10 dernières minutes
    df = df.drop(columns=["per", "rafper"], errors="ignore")

    # On garde que les données des dernières 24h pour la pluie
    df = df.drop(columns=["rr1", "rr3", "rr6", "rr12"], errors="ignore")

    # que des nan
    df = df.drop(columns=["sw"], errors="ignore")

    # on garde les températures sur des périodes de 24h
    df = df.drop(columns=["tx12", "tn12"], errors="ignore")

    df = df.drop(columns=["geop", "niv_bar"], errors="ignore")
    df = df.drop(columns=["ww", "w1", "w2"], errors="ignore")

    return df


def load_and_clean_synop(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, sep=";")
    return clean_synop_df(df)

