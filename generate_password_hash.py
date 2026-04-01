#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script pour générer le hash bcrypt d'un mot de passe
Utilisé pour créer les mots de passe hashés pour les utilisateurs de la base de données
"""

import bcrypt
import sys
from datetime import datetime

def generate_password_hash(nom, annee_naissance):
    """
    Génère le hash bcrypt du mot de passe (Nom + Année de naissance)
    
    Args:
        nom (str): Nom de l'agent
        annee_naissance (int ou str): Année de naissance
    
    Returns:
        tuple: (mot_de_passe_en_clair, hash_bcrypt)
    """
    # Construire le mot de passe : Nom + Année de naissance
    password = nom + str(annee_naissance)
    
    # Générer le hash bcrypt (10 rounds par défaut)
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    return password, password_hash.decode('utf-8')

def main():
    """Fonction principale"""
    print("=" * 60)
    print("Générateur de hash de mot de passe pour PostgreSQL")
    print("=" * 60)
    print()
    
    # Informations de l'agent (à modifier selon vos besoins)
    nom = "DRH"
    prenom = "MINTEST"
    date_naissance = "1980-05-15"
    annee_naissance = 1980
    
    # Extraire l'année de naissance si une date complète est fournie
    if isinstance(date_naissance, str) and len(date_naissance) >= 4:
        try:
            annee_naissance = int(date_naissance.split('-')[0])
        except:
            annee_naissance = int(date_naissance[:4])
    
    print(f"Informations de l'agent :")
    print(f"  Nom : {nom}")
    print(f"  Prénom : {prenom}")
    print(f"  Date de naissance : {date_naissance}")
    print(f"  Année de naissance : {annee_naissance}")
    print()
    
    # Générer le hash
    password, password_hash = generate_password_hash(nom, annee_naissance)
    
    print("=" * 60)
    print("RÉSULTAT")
    print("=" * 60)
    print(f"Mot de passe en clair : {password}")
    print()
    print("Hash bcrypt à utiliser dans le script SQL :")
    print("-" * 60)
    print(f"'{password_hash}'")
    print("-" * 60)
    print()
    
    # Générer le code SQL à copier-coller
    print("Code SQL à copier dans votre script :")
    print("-" * 60)
    print(f"v_password_hash := '{password_hash}';")
    print("-" * 60)
    print()
    
    # Optionnel : demander si l'utilisateur veut personnaliser
    if len(sys.argv) > 1:
        print("Note : Vous pouvez modifier les valeurs dans le script Python")
        print("      ou les passer en arguments :")
        print("      python generate_password_hash.py NOM ANNEE")
        print()
    
    return password, password_hash

if __name__ == "__main__":
    # Si des arguments sont fournis en ligne de commande
    if len(sys.argv) >= 3:
        nom = sys.argv[1]
        annee_naissance = int(sys.argv[2])
        password, password_hash = generate_password_hash(nom, annee_naissance)
        print(f"Mot de passe : {password}")
        print(f"Hash : {password_hash}")
    else:
        main()

