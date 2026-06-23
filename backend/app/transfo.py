import pandas as pd
import re
import unicodedata
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.administration import Formation

# Domaines valides
VALID_DOMAINS = (
    "@gmail.com","@outlook.com", "@outlook.fr","@hotmail.com", "@hotmail.fr",
    "@live.com", "@live.fr","@msn.com","@yahoo.com", "@yahoo.fr","@ymail.com",
    "@icloud.com", "@me.com", "@mac.com", "@orange.fr", "@wanadoo.fr",
    "@sfr.fr", "@neuf.fr","@free.fr","@bbox.fr","@laposte.net",
    "@protonmail.com", "@proton.me","@aol.com", "@aol.fr","@gmx.com", "@gmx.fr",
    "@mail.com","@zoho.com","@yandex.com",
)

# Dictionnaire des corrections de domaines
DOMAIN_CORRECTIONS = {
    "free.frr": "free.fr", "freee.fr": "free.fr", "frree.fr": "free.fr",
    "free.cm": "free.fr", "free.ff": "free.fr", "free.com": "free.fr",
    "freee.com": "free.fr", "f ree.fr": "free.fr",
    "gmail.co": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com",
    "gnail.com": "gmail.com", "gmail.fr": "gmail.com", "gmail.c0m": "gmail.com",
    "gmil.com": "gmail.com", "gmaill.com": "gmail.com", "gmaill.co": "gmail.com",
    "yahho.com": "yahoo.com","yahoo.co": "yahoo.com", "yahooo.com": "yahoo.com",
    "yahoo.fr": "yahoo.com", "yhaoo.com": "yahoo.com", "yaho.com": "yahoo.com",
    "outlok.com": "outlook.com", "outlook.fr": "outlook.com", "outllok.com": "outlook.com",
    "outlookk.com": "outlook.com", "outloook.com": "outlook.com", "outtlook.com": "outlook.com",
    "outlooook.com": "outlook.com", "outlook.co": "outlook.com","outloo.com": "outlook.com",
    "hotmai.com": "hotmail.com", "hotmail.co": "hotmail.com", "hotamil.com": "hotmail.com",
    "hotmal.com": "hotmail.com", "hotmail.co": "hotmail.com",
    "icloud.fr": "icloud.com", "icoud.com": "icloud.com", "iclod.com": "icloud.com", "icloud.co": "icloud.com",
    "orrange.fr": "orange.fr", "orangr.fr": "orange.fr", "orange.com": "orange.fr",
    "wannado.fr": "wanadoo.fr", "wanadoo.com": "wanadoo.fr", "wanado.fr": "wanadoo.fr",
    "sfr.com": "sfr.fr", "sfrr.fr": "sfr.fr",
    "gm@il.com": "gmail.com", "hotmaiil.com": "hotmail.com", "yhaoo.com": "yahoo.com",
}

FORMATION_CORRECTION = {
    "Cycle ingénieur": "Cycle Ingénieur", 
    "Prépa ingénieur": "Cycle Préparatoire",    
    "ingenieur": "Cycle ingénieur", "cycle ingé": "Cycle ingénieur",
    "prepa inge": "Prépa ingénieur", "prepa ingenier": "Prépa ingénieur",
    "bachelor pontoise": "Bachelor Informatique", "bachelor info": "Bachelor Informatique",
    "coding": "Bachelor Coding & IA", "dsns": "Bachelor DSNS (Cyber)",
    "bac+3 coding": "Bachelor Coding & IA", "bac+3 dsns": "Bachelor DSNS (Cyber)",
    "m2i coding": "Mastère Coding & IA", "cycle ingenieur": "Cycle ingénieur",
}

PROFILE_CORRECTION = {
    "Lycéen": "Elève, étudiant", "Lyceen": "Elève, étudiant",
    "Lycée": "Elève, étudiant", "Lycee": "Elève, étudiant",
    "Collégien": "Elève, étudiant", "Collegien": "Elève, étudiant",
    "Collège": "Elève, étudiant", "College": "Elève, étudiant",
    "Etudiant": "Elève, étudiant", "etudiant": "Elève, étudiant",
    "Étudiant": "Elève, étudiant", "étudiant": "Elève, étudiant",
    "Parent": "Parent", "parent": "Parent",
    "Alumni": "Alumni", "alumni": "Alumni",
    "Professionnel":"Professionnel", "professionnel":"Professionnel",
    "Enseignement / Orientation": "Enseignement / Orientation", "enseignement / orientation": "Enseignement / Orientation",
    "Enseignement": "Enseignement / Orientation", "enseignement": "Enseignement / Orientation",
    "Orientation": "Enseignement / Orientation", "orientation": "Enseignement / Orientation",
    "Autre": "Autre", "autre": "Autre"
}

CAMPUS_CORRECTION = {
    "pontoise": "ESIEE-IT-Pontoise", "pontoise (95)": "ESIEE-IT-Pontoise",
    "cergy": "ESIEE-IT-CODING FACTORY Cergy", "cergy (95)": "ESIEE-IT-CODING FACTORY Cergy",
    "paris": "ESIEE-IT-Paris 15", "paris (75)": "ESIEE-IT-Paris 15", "paris (15ème)": "ESIEE-IT-Paris 15",
}


def normalize_text(text):
    if pd.isna(text) or not isinstance(text, str):
        return ""
    text = str(text).strip().lower()
    text = unicodedata.normalize('NFD', text).encode('ascii', 'ignore').decode('utf-8')
    text = re.sub(r'\s+', ' ', text)
    return text

def clean_and_correct_email(email):
    if pd.isna(email) or not isinstance(email, str) or str(email).strip() == "":
        return "", False, "Email manquant"
    
    email = str(email).strip().lower()
    original = email
    email = email.replace(' ', '').replace('\n', '').replace('\r', '')
    
    for domain in VALID_DOMAINS:
        if email.endswith(domain):
            return email, True, None
    
    if '@' in email:
        parts = email.split('@')
        if len(parts) == 2:
            local_part, domain_part = parts
            for domain in VALID_DOMAINS:
                domain_clean = domain.replace('@', '')
                corrected_domain = re.sub(r'(.)\1{2,}', r'\1\1', domain_part)
                corrected_domain = re.sub(r'(.)\1+', r'\1', corrected_domain)
                if corrected_domain == domain_clean:
                    corrected = f"{local_part}@{domain}"
                    if corrected != original:
                        return corrected, True, f"Domaine corrigé: {original} → {corrected}"
                    return corrected, True, None
    
    for wrong, correct in DOMAIN_CORRECTIONS.items():
        if email.endswith(wrong):
            corrected = email[:-len(wrong)] + correct
            if corrected != original:
                return corrected, True, f"Domaine corrigé: {original} → {corrected}"
            return corrected, True, None
    
    for domain in VALID_DOMAINS:
        if email.endswith(domain):
            return email, True, None
    
    # Domaine non standard = ERREUR
    return email, False, f"Domaine email non standard: {email.split('@')[-1] if '@' in email else email}"

def clean_and_correct_phone(phone):
    if pd.isna(phone) or str(phone).strip() == "" or str(phone).strip() == "nan":
        return "", False, "Téléphone manquant"
    
    phone_str = str(phone).strip()
    original = phone_str
    
    if phone_str.endswith('.0'):
        phone_str = phone_str[:-2]
    
    cleaned = re.sub(r'[\s\.\-/\(\)]', '', phone_str)
    cleaned = re.sub(r'[A-Za-z]', '', cleaned)
    if cleaned.startswith('+33') and len(cleaned) == 12:
        return cleaned, True, None
        
    if cleaned.startswith('+'):
        digits = re.sub(r'\D', '', cleaned[1:])
        if len(digits) >= 9 and len(digits) <= 12:
            if len(digits) == 10 and digits.startswith(('6', '7')):
                cleaned = f"+33{digits}"
            if cleaned != original:
                return cleaned, True, f"Format corrigé: {original} → {cleaned}"
            return cleaned, True, None
        return cleaned, False, "Format international invalide"
    
    if len(cleaned) == 10 and cleaned.startswith(('06', '07', '01', '02', '03', '04', '05')):
        corrected = f"+33{cleaned[1:]}"
        if corrected != original:
            return corrected, True, f"Format corrigé: {original} → {corrected}"
        return corrected, True, None
    
    if len(cleaned) == 9 and cleaned.startswith(('6', '7')):
        corrected = f"+33{cleaned}"
        if corrected != original:
            return corrected, True, f"Format corrigé: {original} → {corrected}"
        return corrected, True, None
    
    return phone_str, False, "Format de téléphone invalide"

def clean_formation(nom_formation):
    if pd.isna(nom_formation) or str(nom_formation).strip() == "" or str(nom_formation).strip() == "nan":
        return "", True
    if nom_formation in FORMATION_CORRECTION:
        return FORMATION_CORRECTION.get(nom_formation), False
    return nom_formation,True,

def load_formations_cache(db):
    formations = db.query(Formation).all()

    cache = {}

    for f in formations:
        name_key = f.name.strip().lower()
        cache.setdefault(name_key, []).append({
            "formation": f.name,
            "campus": f.campus
        })

    return cache

def get_formation(formations_cache, name):
    formations_found = []

    for key, formations in formations_cache.items():
        if name.lower() in key:
            formations_found.extend(formations)

    return formations_found

def correct_formation_and_campus(formation, campus, formations_cache):
    campus=str(campus).strip()
    if campus.lower() in CAMPUS_CORRECTION:
        campus = CAMPUS_CORRECTION.get(campus.lower())

    if (pd.isna(formation) or not isinstance(formation, str) or str(formation).strip() == ""or pd.isna(campus) or not isinstance(campus, str) or str(campus).strip() == ""):
        return 4, formation, campus, "Formation et campus invalides."

    nom_formation, error = clean_formation(str(formation).strip())

    if error:
        return 3, nom_formation, campus, "Nom de formation introuvable."

    key = nom_formation.strip().lower()
    formations_found = get_formation(formations_cache,nom_formation)
    
    if not formations_found:
        return 3, nom_formation, campus, "Nom de formation introuvable."

    for formation_db in formations_found:
        if formation_db["campus"] == None or formation_db["campus"] == campus :
            return 0, formation_db["formation"], campus, None
        
        elif (pd.isna(campus) or not isinstance(campus, str) or str(campus).strip() == ""):
            return 1, formation.nom, formation.campus, f"Campus corrigé -> {formation.campus}."

    return 2, nom_formation, campus, "Nom de formation à modifier ou campus incohérent."


def clean_and_correct_profil(profil):
    if pd.isna(profil) or str(profil).strip() == "":
        return "", False,  f"Profil non renseigné."
    
    profil = str(profil).strip()
    
    if profil in PROFILE_CORRECTION:
        profil_attendu=PROFILE_CORRECTION.get(profil)
        return profil_attendu, True, None
    
    return profil, False, f"Profil non reconnu."

def has_error(errors, field_name):
    return any(
        error.get("type") == "error" and error.get("field") == field_name
        for error in errors
    )