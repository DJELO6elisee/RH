"""Outil de recalcul des hash bcrypt pour les comptes agents créés en lot.

Usage :
    python recalc_bcrypt_passwords.py <chemin_donnee_utilisateurs.sql> <chemin_donnee_agents.sql> [chemin_compte_agent.txt]

Le script :
    - Lit les exports SQL (`INSERT INTO ... VALUES (...)`) des tables `utilisateurs` et `agents`.
    - Lit le fichier `compte_agent.txt` généré lors de la création des comptes agents.
    - Regénère les mots de passe attendus (nom normalisé + année de naissance) et produit un script SQL d'UPDATE
      avec des hash bcrypt compatibles avec l'API Node.js.
"""

import csv
import os
import re
import sys
import unicodedata
from datetime import date
from typing import Dict, List, Optional, Tuple

import bcrypt


BASE_DIR = os.path.dirname(__file__)
OUTPUT_FILE = os.path.join(BASE_DIR, "update_password_hashes.sql")
DEFAULT_COMPTE_AGENT_SOURCE = os.path.join(BASE_DIR, "compte_agent.txt")

BCRYPT_PATTERN = re.compile(r"^\$2[aby]\$\d{2}\$[./0-9A-Za-z]{53}$")
TIMESTAMP_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}")


def normalize_name(raw_name: Optional[str]) -> str:
    """Normalise le nom pour construire le mot de passe (minuscules, sans accents, alphanumérique)."""
    if raw_name is None:
        return ""

    nfkd_form = unicodedata.normalize("NFKD", raw_name)
    ascii_name = nfkd_form.encode("ASCII", "ignore").decode("ASCII")
    lowered = ascii_name.lower()
    without_spaces = re.sub(r"\s+", "", lowered)
    return re.sub(r"[^a-z0-9]", "", without_spaces)


def build_plain_password(nom: Optional[str], birth_date_str: Optional[str]) -> Optional[str]:
    """Construit le mot de passe texte (non haché)."""
    if not nom or not birth_date_str:
        return None
    try:
        birth = date.fromisoformat(birth_date_str)
    except ValueError:
        return None

    normalized_name = normalize_name(nom)
    if not normalized_name:
        return None

    return f"{normalized_name}{birth.year}"


def hash_password(plain_password: str) -> str:
    """Retourne un hash bcrypt (12 rounds)."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")


def is_bcrypt(hash_value: str) -> bool:
    return bool(hash_value and BCRYPT_PATTERN.match(hash_value))


def parse_sql_values(segment: str) -> List[Optional[str]]:
    """Découpe les valeurs d'un INSERT SQL en tenant compte des virgules dans les chaînes."""

    def replace_quoted_commas(match: re.Match[str]) -> str:
        return match.group(0).replace(",", "___COMMA___")

    temp_segment = re.sub(r"'[^']*'", replace_quoted_commas, segment)

    reader = csv.reader(
        [temp_segment],
        delimiter=",",
        quotechar="'",
        escapechar="\\",
        skipinitialspace=True,
        strict=True,
    )

    row = next(reader)
    cleaned: List[Optional[str]] = []
    for value in row:
        value = value.strip()
        if value.upper() == "NULL":
            cleaned.append(None)
        else:
            cleaned.append(value.replace("___COMMA___", ",").replace("''", "'"))
    return cleaned


def parse_utilisateurs_sql(path: str) -> List[Tuple[int, str, str, str, Optional[int]]]:
    if not os.path.exists(path):
        print(f"Fichier SQL utilisateurs introuvable : {path}", file=sys.stderr)
        sys.exit(1)

    with open(path, "r", encoding="utf-8", errors="ignore") as handle:
        content = handle.read()

    pattern = re.compile(
        r"INSERT\s+INTO\s+public\.utilisateurs\s+VALUES\s*\((.*?)\);",
        re.IGNORECASE | re.DOTALL,
    )

    utilisateurs: List[Tuple[int, str, str, str, Optional[int]]] = []

    for match in pattern.finditer(content):
        fields = parse_sql_values(match.group(1))
        if len(fields) < 6:
            continue
        try:
            user_id = int(fields[0]) if fields[0] is not None else None
        except (TypeError, ValueError):
            continue

        if user_id is None:
            continue

        username = fields[1] or ""
        email = fields[2] or ""
        password_hash = fields[3] or ""
        id_agent: Optional[int] = None
        if len(fields) > 5 and fields[5] is not None:
            try:
                id_agent = int(fields[5])
            except (TypeError, ValueError):
                id_agent = None

        utilisateurs.append((user_id, username, email, password_hash, id_agent))

    return utilisateurs


def extract_username_and_email(info_lines: List[str]) -> Tuple[str, str]:
    username = ""
    email = ""

    if not info_lines:
        return username, email

    first_line = info_lines[0].strip()
    if first_line:
        tokens = re.split(r"[\t ]+", first_line)
        if tokens:
            username = tokens[0]

    for line in info_lines:
        for candidate in re.findall(r"[^\s]+@[^\s]+", line):
            email = candidate.strip()
            if email:
                break
        if email:
            break

    return username, email


def parse_compte_agent(path: str) -> List[Tuple[int, str, str, Optional[int]]]:
    if not os.path.exists(path):
        print(f"[AVERTISSEMENT] Fichier compte_agent introuvable : {path}", file=sys.stderr)
        return []

    with open(path, "r", encoding="utf-8", errors="ignore") as handle:
        lines = [line.rstrip("\n") for line in handle]

    utilisateurs: List[Tuple[int, str, str, Optional[int]]] = []
    total_lines = len(lines)
    i = 0

    while i < total_lines:
        raw_line = lines[i].strip()

        if not raw_line or raw_line.lower().startswith("utilisateur_id"):
            i += 1
            continue

        if not raw_line.isdigit():
            i += 1
            continue

        user_id = int(raw_line)
        i += 1

        info_lines: List[str] = []
        while i < total_lines:
            candidate = lines[i].strip()
            if not candidate:
                i += 1
                continue
            if candidate.isdigit() or TIMESTAMP_PATTERN.search(candidate):
                break
            info_lines.append(candidate)
            i += 1

        username, email = extract_username_and_email(info_lines)

        agent_id: Optional[int] = None
        if i < total_lines:
            candidate = lines[i].strip()
            if candidate.isdigit():
                agent_id = int(candidate)
                i += 1

        while i < total_lines and not lines[i].strip():
            i += 1

        if i < total_lines and TIMESTAMP_PATTERN.search(lines[i].strip()):
            i += 1

        utilisateurs.append((user_id, username, email, agent_id))

    return utilisateurs


def parse_agents_sql(path: Optional[str]) -> Dict[int, Tuple[str, str, str]]:
    if not path or not os.path.exists(path):
        if path:
            print(
                f"[AVERTISSEMENT] Fichier agents introuvable : {path}. Les noms et dates de naissance seront indisponibles.",
                file=sys.stderr,
            )
        return {}

    with open(path, "r", encoding="utf-8", errors="ignore") as handle:
        content = handle.read()

    pattern = re.compile(
        r"INSERT\s+INTO\s+public\.agents\s+VALUES\s*\((.*?)\);",
        re.IGNORECASE | re.DOTALL,
    )

    agents: Dict[int, Tuple[str, str, str]] = {}

    for match in pattern.finditer(content):
        fields = parse_sql_values(match.group(1))
        if len(fields) < 11:
            continue
        try:
            agent_id = int(fields[0]) if fields[0] is not None else None
        except (TypeError, ValueError):
            continue

        if agent_id is None:
            continue

        nom = fields[7]
        prenom = fields[8]
        date_de_naissance = fields[10]

        if nom and date_de_naissance:
            agents[agent_id] = (nom, prenom or "", date_de_naissance)

    return agents


def generate_updates(
    users_from_compte_agent: List[Tuple[int, str, str, Optional[int]]],
    users_from_sql_dump: List[Tuple[int, str, str, str, Optional[int]]],
    agents_data: Dict[int, Tuple[str, str, str]],
) -> List[str]:
    updates: List[str] = []
    total_users_processed = 0
    candidates_for_update = 0

    sql_users_map = {u[0]: u for u in users_from_sql_dump if u[0] is not None}

    for user_id, username_ca, email_ca, agent_id_ca in users_from_compte_agent:
        total_users_processed += 1

        user_in_sql_dump = sql_users_map.get(user_id)
        current_password_hash = user_in_sql_dump[3] if user_in_sql_dump else ""

        if is_bcrypt(current_password_hash):
            continue

        if agent_id_ca is None:
            print(
                f"[AVERTISSEMENT] id_agent absent pour l'utilisateur {user_id} ({username_ca}).",
                file=sys.stderr,
            )
            continue

        agent_info = agents_data.get(agent_id_ca)
        if agent_info is None:
            print(
                f"[AVERTISSEMENT] Informations agent introuvables pour id_agent {agent_id_ca} (utilisateur {user_id}).",
                file=sys.stderr,
            )
            continue

        nom_agent, prenom_agent, date_naissance_agent = agent_info
        plain_password = build_plain_password(nom_agent, date_naissance_agent)

        if plain_password is None:
            print(
                f"[AVERTISSEMENT] Date de naissance indisponible pour l'utilisateur {user_id} ({username_ca}).",
                file=sys.stderr,
            )
            continue

        new_hash = hash_password(plain_password)
        candidates_for_update += 1
        updates.append(
            f"-- Utilisateur ID: {user_id}, Username: {username_ca}, Agent ID: {agent_id_ca}, "
            f"Nom: {nom_agent}, Prénom: {prenom_agent}, Date de naissance: {date_naissance_agent}\n"
            f"UPDATE utilisateurs\n"
            f"   SET password_hash = '{new_hash}',\n"
            f"       updated_at = CURRENT_TIMESTAMP\n"
            f" WHERE id = {user_id};\n"
        )

    print(f"{total_users_processed} comptes issus de compte_agent.txt.")
    print(
        f"{len(users_from_sql_dump)} lignes utilisateurs détectées, "
        f"{len(agents_data)} agents disponibles pour associer les noms."
    )
    print(f"{candidates_for_update} comptes à mettre à jour.")
    return updates


def write_sql(updates: List[str]) -> None:
    if not updates:
        print("Aucun utilisateur à mettre à jour.")
        return

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("-- Script généré automatiquement pour recalculer les hash bcrypt\n")
        f.write("BEGIN;\n\n")

        for statement in updates:
            f.write(statement)
            f.write("\n")
        f.write("COMMIT;\n")

    print(f"{len(updates)} instructions UPDATE écrites dans {OUTPUT_FILE}")


def main() -> None:
    if len(sys.argv) < 3:
        print(
            "Usage: python recalc_bcrypt_passwords.py <path_to_utilisateurs.sql> <path_to_agents.sql> "
            "[path_to_compte_agent.txt]",
            file=sys.stderr,
        )
        sys.exit(1)

    users_sql_path = sys.argv[1]
    agents_sql_path = sys.argv[2]
    compte_agent_path = sys.argv[3] if len(sys.argv) > 3 else DEFAULT_COMPTE_AGENT_SOURCE

    users_from_sql_dump = parse_utilisateurs_sql(users_sql_path)
    agents_data = parse_agents_sql(agents_sql_path)
    users_from_compte_agent = parse_compte_agent(compte_agent_path)

    updates = generate_updates(users_from_compte_agent, users_from_sql_dump, agents_data)
    write_sql(updates)


if __name__ == "__main__":
    main()