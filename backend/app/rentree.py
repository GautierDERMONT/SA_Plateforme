# backend/app/rentree.py
from datetime import datetime

def calculate_rentree_date(classe_actuelle):
    """Calcule la date de rentrée prévisionnelle en fonction de la classe"""
    if not classe_actuelle or classe_actuelle.strip() == "":
        return None
    
    classe_normalized = classe_actuelle.lower().replace(" ", "")
    
    # Mapping classe → années avant l'entrée
    class_offset = {
        # Collège
        '6ème': 6, '6eme': 6, 'cinquième': 5, '5ème': 5, '5eme': 5,
        'quatrième': 4, '4ème': 4, '4eme': 4, 'troisième': 3, '3ème': 3, '3eme': 3,
        # Lycée
        'seconde': 2, '2nde': 2, '2nd': 2,
        'première': 1, '1ère': 1, '1ere': 1,
        'terminale': 0, 'tale': 0, 'term': 0,
        # Post-bac
        'bac+1': 0, 'licence 1': 0, 'l1': 0,
        'bac+2': 0, 'licence 2': 0, 'l2': 0,
        'bac+3': 0, 'licence 3': 0, 'l3': 0,
        'bac+4': 0, 'master 1': 0, 'm1': 0,
        'bac+5': 0, 'master 2': 0, 'm2': 0,
        # Générique
        'lycéen': 1, 'lyceen': 1, 'lycée': 1,  'lycee': 1,
        'collégien': 3, 'collegien': 3,'collège': 3,'college': 3,
        'étudiant': 0, 'etudiant': 0,
    }
    
    # Trouver l'offset
    offset = None
    for key, value in class_offset.items():
        if key in classe_normalized:
            offset = value
            break
    
    if offset is None:
        return None
    
    now = datetime.now()
    current_month = now.month
    current_year = now.year
    
    # Calculer l'année cible
    if offset == 0:
        target_year = current_year + 1 if current_month >= 9 else current_year
    elif offset > 0:
        target_year = current_year + offset
    else:
        target_year = current_year + offset
        if current_month >= 9:
            target_year += 1
    
    return f"{target_year}-{target_year+1}"