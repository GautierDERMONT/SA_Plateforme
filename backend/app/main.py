from fastapi import FastAPI, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from app.api.routes import router
from app.database import engine, Base
from app.models import user
from app.models.administration import Formation, EnrollmentDate
import pandas as pd
from io import BytesIO

# Import des modules internes
from .transfo import (
    clean_and_correct_email,
    clean_and_correct_phone,
    clean_and_correct_city,
    clean_and_correct_formation,
    clean_and_correct_campus,
    clean_and_correct_zipcode,
    VALID_DOMAINS
)
from .postal_codes import get_city_from_postal_code
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
        df = pd.read_csv(file.file, dtype={'Téléphone': str, 'zipcode': str})
    else:
        df = pd.read_excel(file.file, dtype={'Téléphone': str, 'zipcode': str})
    
    processed_rows = []
    stats = {
        'email_fixed': 0, 'phone_fixed': 0, 'city_fixed': 0, 
        'formation_fixed': 0, 'campus_fixed': 0, 'zip_fixed': 0, 
        'rentree_fixed': 0
    }
    
    for index, row in df.iterrows():
        errors = []
        
        # Récupérer les valeurs (gérer les NaN)
        raw_nom = row.get("Nom", "")
        raw_prenom = row.get("Prénom", "")
        raw_email = row.get("Email", "")
        raw_phone = row.get("Téléphone", "")
        raw_zip = row.get("zipcode", "")
        raw_city = row.get("city", "")
        raw_formation = row.get("Souhaits de formations :", "")
        raw_campus = row.get("Choix de campus :", "")
        # Essayer les deux apostrophes
        raw_classe = row.get("Actuellement, l'étudiant est en :", "")
        if not raw_classe or pd.isna(raw_classe):
            raw_classe = row.get("Actuellement, l’étudiant est en :", "") 
        if not raw_classe or pd.isna(raw_classe):
            raw_classe = row.get("Actuellement, l'étudiant est en", "")
        if not raw_classe or pd.isna(raw_classe):
            raw_classe = row.get("Actuellement, l’étudiant est en", "")
        print(f"🔍 DEBUG - raw_classe = '{raw_classe}'")  

        
        # Convertir en string et gérer les NaN
        if pd.isna(raw_nom): raw_nom = ""
        if pd.isna(raw_prenom): raw_prenom = ""
        if pd.isna(raw_email): raw_email = ""
        if pd.isna(raw_phone): raw_phone = ""
        if pd.isna(raw_zip): raw_zip = ""
        if pd.isna(raw_city): raw_city = ""
        if pd.isna(raw_formation): raw_formation = ""
        if pd.isna(raw_campus): raw_campus = ""
        if pd.isna(raw_classe): raw_classe = ""
        
        # Nettoyer les téléphones (enlever .0 à la fin)
        if isinstance(raw_phone, str) and raw_phone.endswith('.0'):
            raw_phone = raw_phone[:-2]
        elif isinstance(raw_phone, float):
            raw_phone = str(int(raw_phone)) if raw_phone == int(raw_phone) else str(raw_phone)
        
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
        
        # Correction du code postal
        corrected_zip, zip_valid, zip_msg = clean_and_correct_zipcode(raw_zip)
        if not zip_valid and zip_msg:
            errors.append({"field": "codePostal", "type": "error", "message": zip_msg})
        elif zip_msg:
            errors.append({"field": "codePostal", "type": "warning", "message": zip_msg})
            stats['zip_fixed'] += 1
        
        # Auto-remplissage ville depuis code postal
        corrected_city = raw_city
        if (not raw_city or str(raw_city).strip() == "") and corrected_zip and len(corrected_zip) == 5:
            auto_city = get_city_from_postal_code(corrected_zip)
            if auto_city:
                corrected_city = auto_city
                errors.append({"field": "ville", "type": "warning", "message": f"Ville auto-remplie depuis le code postal: {auto_city}"})
                stats['city_fixed'] += 1
                print(f"✅ Auto-remplissage: CP {corrected_zip} → {auto_city}")
        else:
            corrected_city, city_valid, city_msg = clean_and_correct_city(raw_city)
            if city_msg:
                errors.append({"field": "ville", "type": "warning", "message": city_msg})
                stats['city_fixed'] += 1
        
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
        
        # ✅ Calcul de la date de rentrée prévisionnelle (depuis rentree.py)
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
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    data = pd.read_excel(file.file, usecols="A:E,G:I,V:X,Z", dtype={"Téléphone": str})
    
    from openpyxl import load_workbook
    from openpyxl.styles import PatternFill
    
    red_fill = PatternFill(start_color="FF0000", end_color="FF0000", fill_type="solid")
    start_row = 2
    
    wb = load_workbook("Matrice import CRM.xlsx")
    ws = wb["Template"]
    
    data["profiles"] = data["profiles"].replace({
        "Lycéen": "Elève, étudiant",
        "Collégien": "Elève, étudiant",
        "Etudiant": "Elève, étudiant"
    })
    
    for i, row in data.iterrows():
        ws.cell(row=start_row + i, column=3, value=row["profiles"])
        ws.cell(row=start_row + i, column=5, value=row["Nom"])
        ws.cell(row=start_row + i, column=6, value=row["Prénom"])
        
        if not str(row["Email"]).endswith(VALID_DOMAINS):
            ws.cell(row=start_row + i, column=7, value=row["Email"]).fill = red_fill
        else:
            ws.cell(row=start_row + i, column=7, value=row["Email"])
        
        if not str(row["Téléphone"]).startswith("+") or len(str(row["Téléphone"])) != 12:
            ws.cell(row=start_row + i, column=8, value=row["Téléphone"]).fill = red_fill
        else:
            ws.cell(row=start_row + i, column=8, value=row["Téléphone"])
        
        ws.cell(row=start_row + i, column=12, value=row["zipcode"])
        ws.cell(row=start_row + i, column=15, value=row["Actuellement, l'étudiant est en :"])
        ws.cell(row=start_row + i, column=22, value=row["Choix de campus :"])
        ws.cell(row=start_row + i, column=23, value=row["Souhaits de formations :"])
    
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=crm_ready.xlsx"}
    )