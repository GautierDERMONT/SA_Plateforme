import pandas as pd
import re
import unicodedata

# Domaines valides
VALID_DOMAINS = (
    "@gmail.com", "@yahoo.com", "@outlook.com", "@hotmail.com",
    "@live.com", "@icloud.com", "@msn.com", "@laposte.net",
    "@orange.fr", "@sfr.fr", "@free.fr", "@wanadoo.fr",
    "@aol.com", "@protonmail.com", "@gmx.com", "@gmx.fr", "@mail.com"
)

# Dictionnaire des corrections de domaines
DOMAIN_CORRECTIONS = {
    "free.frr": "free.fr", "freee.fr": "free.fr", "frree.fr": "free.fr",
    "free.cm": "free.fr", "free.ff": "free.fr", "free.com": "free.fr",
    "freee.com": "free.fr", "f ree.fr": "free.fr",
    "gmail.co": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com",
    "gnail.com": "gmail.com", "gmail.fr": "gmail.com", "gmail.c0m": "gmail.com",
    "gmil.com": "gmail.com", "gmaill.com": "gmail.com",
    "yahho.com": "yahoo.com", "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com",
    "yahoo.fr": "yahoo.com", "yhaoo.com": "yahoo.com",
    "outlok.com": "outlook.com", "outlook.fr": "outlook.com", "outllok.com": "outlook.com",
    "outlookk.com": "outlook.com", "outloook.com": "outlook.com", "outtlook.com": "outlook.com",
    "outlooook.com": "outlook.com",
    "hotmai.com": "hotmail.com", "hotmail.co": "hotmail.com", "hotamil.com": "hotmail.com",
    "hotmal.com": "hotmail.com",
    "icloud.fr": "icloud.com", "icoud.com": "icloud.com", "iclod.com": "icloud.com",
    "orrange.fr": "orange.fr", "orangr.fr": "orange.fr", "orange.com": "orange.fr",
    "wannado.fr": "wanadoo.fr", "wanadoo.com": "wanadoo.fr", "wanado.fr": "wanadoo.fr",
    "sfr.com": "sfr.fr", "sfrr.fr": "sfr.fr",
    "gm@il.com": "gmail.com", "hotmaiil.com": "hotmail.com", "yhaoo.com": "yahoo.com",
}

CITIES_CORRECTION = {
    "paris": "Paris", "lyon": "Lyon", "marseille": "Marseille", "toulouse": "Toulouse",
    "nice": "Nice", "nantes": "Nantes", "strasbourg": "Strasbourg", "montpellier": "Montpellier",
    "bordeaux": "Bordeaux", "lille": "Lille", "rennes": "Rennes", "reims": "Reims",
    "st etienne": "Saint-Étienne", "saint etienne": "Saint-Étienne", "toulon": "Toulon",
    "grenoble": "Grenoble", "angers": "Angers", "dijon": "Dijon", "brest": "Brest",
    "le mans": "Le Mans", "clermont ferrand": "Clermont-Ferrand", "clermont-ferrand": "Clermont-Ferrand",
}

FORMATION_CORRECTION = {
    "inge": "Cycle ingénieur", "ingenieur": "Cycle ingénieur", "cycle ingé": "Cycle ingénieur",
    "prepa inge": "Prépa ingénieur", "prepa ingenier": "Prépa ingénieur",
    "bachelor pontoise": "Bachelor Informatique", "bachelor info": "Bachelor Informatique",
    "coding": "Bachelor Coding & IA", "dsns": "Bachelor DSNS (Cyber)",
    "bac+3 coding": "Bachelor Coding & IA", "bac+3 dsns": "Bachelor DSNS (Cyber)",
    "m2i coding": "Mastère Coding & IA", "cycle ingenieur": "Cycle ingénieur",
}

CAMPUS_CORRECTION = {
    "pontoise": "Pontoise (95)", "pontoise (95)": "Pontoise (95)",
    "cergy": "Cergy (95)", "cergy (95)": "Cergy (95)",
    "paris": "Paris (75)", "paris (75)": "Paris (75)",
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
    
    # 🔥 CHANGEMENT ICI : Domaine non standard = ERREUR
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

def clean_and_correct_city(city):
    if pd.isna(city) or not isinstance(city, str) or str(city).strip() == "":
        return "", True, None
    
    city_str = str(city).strip()
    original = city_str
    normalized = normalize_text(city_str)
    
    for wrong, correct in CITIES_CORRECTION.items():
        if normalized == wrong or normalized in wrong:
            if correct != original:
                return correct, True, f"Ville corrigée: {original} → {correct}"
            return correct, True, None
    
    corrected = city_str.title()
    if corrected != original:
        return corrected, True, f"Format corrigé: {original} → {corrected}"
    
    return city_str, True, None

def clean_and_correct_formation(formation):
    if pd.isna(formation) or not isinstance(formation, str) or str(formation).strip() == "":
        return "", True, None
    
    formation_str = str(formation).strip()
    original = formation_str
    normalized = normalize_text(formation_str)
    
    for wrong, correct in FORMATION_CORRECTION.items():
        if wrong in normalized or normalized == wrong:
            if correct != original:
                return correct, True, f"Formation corrigée: {original} → {correct}"
            return correct, True, None
    
    return formation_str, True, None

def clean_and_correct_campus(campus):
    if pd.isna(campus) or not isinstance(campus, str) or str(campus).strip() == "":
        return "", True, None
    
    campus_str = str(campus).strip()
    original = campus_str
    normalized = normalize_text(campus_str)
    
    for wrong, correct in CAMPUS_CORRECTION.items():
        if wrong in normalized or normalized == wrong:
            if correct != original:
                return correct, True, f"Campus corrigé: {original} → {correct}"
            return correct, True, None
    
    return campus_str, True, None

def clean_and_correct_zipcode(zipcode):
    if pd.isna(zipcode):
        return "", True, None
    
    zip_str = str(zipcode).strip()
    original = zip_str
    digits = re.sub(r'\D', '', zip_str)
    
    if len(digits) == 5 and digits.isdigit():
        return digits, True, None
    elif len(digits) > 5:
        corrected = digits[:5]
        if corrected != original:
            return corrected, True, f"Code postal tronqué: {original} → {corrected}"
        return corrected, True, None
    elif 0 < len(digits) < 5:
        corrected = digits.zfill(5)
        if corrected != original:
            return corrected, True, f"Code postal corrigé: {original} → {corrected}"
        return corrected, True, None
    
    return "", False, "Code postal invalide"