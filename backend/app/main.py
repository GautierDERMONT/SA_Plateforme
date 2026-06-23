from fastapi import FastAPI, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from app.api.routes import router
from app.database import engine, Base
from app.models import user
from app.models.administration import Formation, EnrollmentDate
import pandas as pd
from io import BytesIO
from openpyxl import load_workbook
from openpyxl.styles import PatternFill

# Import des modules internes
from .transfo import (
    clean_and_correct_email,
    clean_and_correct_phone,
    clean_and_correct_formation,
    clean_and_correct_campus,
    clean_and_correct_profil,
    VALID_DOMAINS
)
# from .postal_codes import get_city_from_postal_code
from .postal_codes import get_city_and_postal_code

from .rentree import calculate_rentree_date  # ← NOUVEAU

# Créer les tables dans la base de données
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SA Plateforme API", version="1.0.0")

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Bienvenue sur l'API SA Plateforme", "docs": "/docs"}

# Route pour l'aperçu avec corrections
@app.post("/process-and-preview")
async def process_and_preview(file: UploadFile = File(...)):
    """Traite le fichier et retourne les données corrigées au format JSON"""
    
    # Lire le fichier avec les bons types
    if file.filename.endswith('.csv'):
        df = pd.read_csv(file.file, dtype={'Téléphone': str, 'Phone number':str, 'zipcode': str})
    else:
        df = pd.read_excel(file.file, dtype={'Téléphone': str, 'Phone number':str, 'zipcode': str})
    
    processed_rows = []
    stats = {
        'email_fixed': 0, 'phone_fixed': 0, 'city_fixed': 0, 
        'formation_fixed': 0, 'campus_fixed': 0, 'zip_fixed': 0, 
        'rentree_fixed': 0
    }
    
    for index, row in df.iterrows():
        errors = []
        
        # Récupérer les valeurs (gérer les NaN)        
        raw_profil = row.get("Profiles", "") or row.get("profiles", "")
        raw_nom = row.get("Nom", "") or row.get("Last name", "")
        raw_prenom = row.get("Prénom", "") or row.get("First name", "")
        raw_email = row.get("Email", "")
        raw_phone = row.get("Téléphone", "") or row.get("Phone number", "")
        raw_zip = row.get("zipcode", "")
        raw_city = row.get("city", "")
        raw_formation = row.get("Souhaits de formations :", "")
        raw_campus = row.get("Choix de campus :", "")
        # Essayer les deux apostrophes
        raw_classe = row.get("Actuellement, l'étudiant est en :", "")
        if not raw_classe or pd.isna(raw_classe):
            raw_classe = row.get("Actuellement, l’étudiant est en :", "") 
        if not raw_classe or pd.isna(raw_classe):
            raw_classe = row.get("Actuellement, l’étudiant est en : ", "") 
        if not raw_classe or pd.isna(raw_classe):
            raw_classe = row.get("Actuellement, l'étudiant est en", "")
        if not raw_classe or pd.isna(raw_classe):
            raw_classe = row.get("Actuellement, l’étudiant est en", "")
        # print(f"🔍 DEBUG - raw_classe = '{raw_classe}'")  

        
        # Convertir en string et gérer les NaN
        if pd.isna(raw_profil): raw_profil = ""
        if pd.isna(raw_nom): raw_nom = ""
        if pd.isna(raw_prenom): raw_prenom = ""
        if pd.isna(raw_email): raw_email = ""
        if pd.isna(raw_phone): raw_phone = ""
        if pd.isna(raw_zip): raw_zip = ""
        if pd.isna(raw_city): raw_city = ""
        if pd.isna(raw_formation): raw_formation = ""
        if pd.isna(raw_campus): raw_campus = ""
        if pd.isna(raw_classe): raw_classe = ""
        
        # Correction du profil
        corrected_profil, profil_valid, profil_msg = clean_and_correct_profil(raw_profil)
        if not profil_valid:
            errors.append({"field": "profil", "type": "error", "message": profil_msg})
        
        if not raw_nom:
            errors.append({"field": "nom", "type": "error", "message": "Nom manquant"})
            
        if not raw_prenom:
            errors.append({"field": "prénom", "type": "error", "message": "Préom manquant"})
        
        # Nettoyer les emails
        if isinstance(raw_email, str):
            raw_email = raw_email.strip()
        
        # Correction de l'email
        corrected_email, email_valid, email_msg = clean_and_correct_email(raw_email)
        if not email_valid:
            errors.append({"field": "email", "type": "error", "message": email_msg})
        elif email_msg:
            errors.append({"field": "email", "type": "warning", "message": email_msg})
            stats['email_fixed'] += 1

        # Correction du téléphone
        corrected_phone, phone_valid, phone_msg = clean_and_correct_phone(raw_phone)
        if not phone_valid:
            errors.append({"field": "telephone", "type": "error", "message": phone_msg})
        elif phone_msg:
            errors.append({"field": "telephone", "type": "warning", "message": phone_msg})
            stats['phone_fixed'] += 1
        
        # Correction code postal+ville
        error, corrected_zip, corrected_city, msg = get_city_and_postal_code(raw_zip,raw_city)
        if error==1:
            errors.append({"field": "codePostal", "type": "error", "message": msg})
            errors.append({"field": "ville", "type": "error", "message": msg})
        elif error==2:
            errors.append({"field": "ville", "type": "warning", "message": msg})
            stats['city_fixed'] += 1
        elif error==3:
            errors.append({"field": "codePostal", "type": "error", "message": msg})
            errors.append({"field": "ville", "type": "error", "message": "Impossible de trouver une ville correspondante"})
        elif error==4:
            errors.append({"field": "codePostal", "type": "warning", "message": msg})
            stats['zip_fixed'] += 1
        elif error==5:
            errors.append({"field": "ville", "type": "error", "message": msg})
        elif error==6:
            errors.append({"field": "codePostal", "type": "error", "message": "Aucun code postale renseigné."})
            errors.append({"field": "ville", "type": "error", "message": "Aucune ville renseigné."})
        
        # Correction de la formation
        corrected_formation, formation_valid, formation_msg = clean_and_correct_formation(raw_formation)
        if formation_msg and formation_msg.startswith(('Formation corrigée', 'Format corrigé')):
            errors.append({"field": "formation", "type": "warning", "message": formation_msg})
            stats['formation_fixed'] += 1
        elif not formation_valid and formation_msg:
            errors.append({"field": "formation", "type": "error", "message": formation_msg})
        
        # Correction du campus avec auto-attribution
        corrected_campus, campus_valid, campus_msg = clean_and_correct_campus(raw_campus, corrected_formation)
        if campus_msg and campus_msg.startswith(('Campus corrigé', 'Format corrigé', 'Campus auto-attribué')):
            errors.append({"field": "campus", "type": "warning", "message": campus_msg})
            stats['campus_fixed'] += 1
        elif not campus_valid and campus_msg:
            errors.append({"field": "campus", "type": "error", "message": campus_msg})
        
        # Calcul de la date de rentrée prévisionnelle (depuis rentree.py)
        rentree_date = None
        if raw_classe and str(raw_classe).strip():
            rentree_date = calculate_rentree_date(str(raw_classe))
            if rentree_date:
                stats['rentree_fixed'] += 1
                errors.append({
                    "field": "dateRentreePrev", 
                    "type": "warning", 
                    "message": f"Date de rentrée calculée: {rentree_date} (basé sur classe: {raw_classe})"
                })
                print(f"📅 Date rentrée calculée: {raw_classe} → {rentree_date}")
        
        processed_rows.append({
            "id": index + 1,
            "profil": corrected_profil,
            "nom": str(raw_nom) if raw_nom else "",
            "prenom": str(raw_prenom) if raw_prenom else "",
            "email": corrected_email,
            "telephone": corrected_phone,
            "codePostal": corrected_zip,
            "ville": corrected_city,
            "formation": corrected_formation,
            "campus": corrected_campus,
            "classeActuelle": str(raw_classe) if raw_classe else "",
            "dateRentreePrev": rentree_date if rentree_date else "",
            "errors": errors
        })
    
    # Afficher les statistiques
    print("\n" + "="*50)
    print("STATISTIQUES DES CORRECTIONS")
    print("="*50)
    print(f"📧 Emails corrigés: {stats['email_fixed']}")
    print(f"📞 Téléphones corrigés: {stats['phone_fixed']}")
    print(f"📍 Codes postaux corrigés: {stats['zip_fixed']}")
    print(f"🏙️ Villes auto-remplies: {stats['city_fixed']}")
    print(f"🎓 Formations corrigées: {stats['formation_fixed']}")
    print(f"🏫 Campus corrigés: {stats['campus_fixed']}")
    print(f"📅 Dates rentrée calculées: {stats['rentree_fixed']}")
    print("="*50)
    
    salon_name = file.filename.replace('.xlsx', '').replace('.xls', '').replace('.csv', '')
    
    return JSONResponse(content={
        "success": True,
        "data": processed_rows,
        "total_rows": len(processed_rows),
        "salon_name": salon_name,
        "stats": stats
    })


# Route pour l'export Excel original
@app.post("/download")
# async def upload_file(data: dict):
async def upload_file(data: dict):
    rows = data.get("rows", [])
    red_fill = PatternFill(start_color="FF0000", end_color="FF0000", fill_type="solid")
    start_row = 2
    
    wb = load_workbook("Matrice import CRM.xlsx")
    ws = wb["Template"]
        
    for i, row in enumerate(rows, start=start_row):
        ws.cell(row=2 + i, column=3, value=row.get("profil",""))
        ws.cell(row=i, column=2, value=row.get("dateRentreePrev", ""))
        ws.cell(row=i, column=5, value=row.get("nom", ""))
        ws.cell(row=i, column=6, value=row.get("prenom", ""))
        
        # if not row.get("email", "").endswith(VALID_DOMAINS):
        #     ws.cell(row=2 + i, column=7, value=row.get("email", "")).fill = red_fill
        # else:
        ws.cell(row=i, column=7, value=row.get("email", ""))
        
        # if not row.get("telephone", "").startswith("+") or len(row.get("telephone", "")) != 12:
        #     ws.cell(row=2 + i, column=8, value=row.get("telephone", "")).fill = red_fill
        # else:
        ws.cell(row=i, column=8, value=row.get("telephone", ""))
        
        ws.cell(row=i, column=12, value=row.get("codePostal", ""))
        ws.cell(row=i, column=13, value=row.get("ville", ""))
        ws.cell(row=i, column=15, value=row.get("classeActuelle", ""))
        ws.cell(row=i, column=22, value=row.get("campus", ""))
        ws.cell(row=i, column=23, value=row.get("formation", ""))

    output = BytesIO()
    wb.save(output)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="test"'}
    )