from fastapi import FastAPI, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from app.api.routes import router
from app.database import engine, Base
from app.models import user
import pandas as pd
import json
from io import BytesIO

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

# Domain possible pour les adresses mails
valid_domains = (
    "@gmail.com", "@yahoo.com", "@outlook.com", "@hotmail.com",
    "@live.com", "@icloud.com", "@msn.com", "@laposte.net",
    "@orange.fr", "@sfr.fr", "@free.fr", "@wanadoo.fr",
    "@aol.com", "@protonmail.com", "@gmx.com", "@gmx.fr", "@mail.com"
)

app.include_router(router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Bienvenue sur l'API SA Plateforme", "docs": "/docs"}

# Nouvelle fonction qui retourne les données JSON pour l'aperçu
@app.post("/process-and-preview")
async def process_and_preview(file: UploadFile = File(...)):
    """Traite le fichier et retourne les données au format JSON pour l'aperçu"""
    
    data = pd.read_excel(file.file)
    
    # Transformer les données au format attendu par PreviewPage
    processed_rows = []
    
    for index, row in data.iterrows():
        # Nettoie le téléphone
        telephone = str(row.get("Téléphone", ""))
        if not telephone.startswith("+") or len(telephone) != 12:
            if len(telephone) == 10 and telephone.startswith("0"):
                telephone = "+33" + telephone[1:]
        
        # Nettoie l'email
        email = str(row.get("Email", ""))
        email_errors = []
        if not any(email.endswith(domain) for domain in valid_domains):
            email_errors.append({"field": "email", "message": "Domaine email non reconnu", "type": "warning"})
        
        processed_rows.append({
            "id": index + 1,
            "nom": str(row.get("Nom", "")),
            "prenom": str(row.get("Prénom", "")),
            "email": email,
            "telephone": telephone,
            "codePostal": str(row.get("zipcode", "")),
            "ville": str(row.get("Ville", "")),
            "formation": str(row.get("Souhaits de formations :", "")),
            "campus": str(row.get("Choix de campus :", "")),
            "classeActuelle": str(row.get("Actuellement, l’étudiant est en :", "")),
            "dateRentreePrev": "",
            "errors": email_errors if email_errors else []
        })
    
    return JSONResponse(content={
        "success": True,
        "data": processed_rows,
        "total_rows": len(processed_rows),
        "salon_name": "Salon importé"
    })

# Fonction originale pour télécharger le fichier Excel
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    data = pd.read_excel(file.file, usecols="A:E,G:I,V:X,Z", dtype={"Téléphone": str})
    
    from openpyxl import load_workbook
    from openpyxl.styles import PatternFill
    from io import BytesIO
    
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
        
        if not str(row["Email"]).endswith(valid_domains):
            ws.cell(row=start_row + i, column=7, value=row["Email"]).fill = red_fill
        else:
            ws.cell(row=start_row + i, column=7, value=row["Email"])
        
        if not str(row["Téléphone"]).startswith("+") or len(str(row["Téléphone"])) != 12:
            ws.cell(row=start_row + i, column=8, value=row["Téléphone"]).fill = red_fill
        else:
            ws.cell(row=start_row + i, column=8, value=row["Téléphone"])
        
        ws.cell(row=start_row + i, column=12, value=row["zipcode"])
        ws.cell(row=start_row + i, column=15, value=row["Actuellement, l’étudiant est en :"])
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