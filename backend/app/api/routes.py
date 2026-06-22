# routes.py - Version corrigée avec le bon ordre

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.auth import authenticate_user, create_access_token, get_current_user, hash_password
from app.models.administration import Formation, EnrollmentDate
from datetime import date as date_type

# ================================================
# ⚠️ CRUCIAL : Créer le router AVANT les routes !
# ================================================
router = APIRouter()

# ============ MODÈLES PYDANTIC ============
class Item(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

class ItemCreate(BaseModel):
    name: str
    description: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    is_active: bool

# ============ BASE DE DONNÉES TEMPORAIRE ============
items_db = [
    {"id": 1, "name": "Item 1", "description": "Description 1"},
    {"id": 2, "name": "Item 2", "description": "Description 2"}
]

# ============ ROUTE D'INSCRIPTION PUBLIQUE ============
@router.post("/register")
async def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):
    """Inscription d'un nouvel utilisateur (public)"""
    
    # Vérifier si l'email existe déjà
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    # Valider le mot de passe (au moins 6 caractères)
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")
    
    # Hacher le mot de passe
    hashed_password = hash_password(request.password)
    
    # Créer le nouvel utilisateur
    new_user = User(
        email=request.email,
        password=hashed_password,
        full_name=request.full_name,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Générer un token pour l'utilisateur directement
    access_token = create_access_token(data={"sub": new_user.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name
        }
    }

# ============ ROUTES D'AUTHENTIFICATION ============
@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name}
    }

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id, 
        "email": current_user.email, 
        "full_name": current_user.full_name
    }

# ============ ROUTE POUR SUPPRIMER SON PROPRE COMPTE ============
@router.delete("/me")
async def delete_my_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Supprime son propre compte"""
    
    # Vérifier si c'est un admin (on ne peut pas supprimer le compte admin par cette route)
    if current_user.full_name == "Administrateur":
        raise HTTPException(status_code=403, detail="L'administrateur ne peut pas supprimer son compte via cette route")
    
    db.delete(current_user)
    db.commit()
    
    return {"message": "Votre compte a été supprimé avec succès"}

# ============ ROUTES EXISTANTES ============
@router.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Backend FastAPI is running"}

@router.get("/data", response_model=List[Item])
async def get_data(current_user: User = Depends(get_current_user)):
    """Récupère tous les items (protégé par auth)"""
    return items_db

@router.get("/data/{item_id}", response_model=Item)
async def get_item(item_id: int, current_user: User = Depends(get_current_user)):
    for item in items_db:
        if item["id"] == item_id:
            return item
    raise HTTPException(status_code=404, detail="Item not found")

@router.post("/data", response_model=Item)
async def create_item(item: ItemCreate, current_user: User = Depends(get_current_user)):
    new_id = max([i["id"] for i in items_db]) + 1 if items_db else 1
    new_item = {"id": new_id, **item.dict()}
    items_db.append(new_item)
    return new_item

@router.put("/data/{item_id}", response_model=Item)
async def update_item(item_id: int, item: ItemCreate, current_user: User = Depends(get_current_user)):
    for i, existing_item in enumerate(items_db):
        if existing_item["id"] == item_id:
            items_db[i] = {"id": item_id, **item.dict()}
            return items_db[i]
    raise HTTPException(status_code=404, detail="Item not found")

@router.delete("/data/{item_id}")
async def delete_item(item_id: int, current_user: User = Depends(get_current_user)):
    for i, item in enumerate(items_db):
        if item["id"] == item_id:
            items_db.pop(i)
            return {"message": "Item deleted"}
    raise HTTPException(status_code=404, detail="Item not found")

# ============ ROUTES ADMIN FORMATIONS ============
@router.get("/admin/formations")
async def admin_get_formations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.full_name != "Administrateur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    formations = db.query(Formation).order_by(Formation.id).all()
    return formations

@router.post("/admin/formations")
async def admin_create_formation(
    name: str,
    campus: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.full_name != "Administrateur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    formation = Formation(name=name, campus=campus)
    db.add(formation)
    db.commit()
    db.refresh(formation)
    return formation

@router.put("/admin/formations/{formation_id}")
async def admin_update_formation(
    formation_id: int,
    name: str,
    campus: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.full_name != "Administrateur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    formation = db.query(Formation).filter(Formation.id == formation_id).first()
    if not formation:
        raise HTTPException(status_code=404, detail="Formation non trouvée")
    
    formation.name = name
    formation.campus = campus
    db.commit()
    db.refresh(formation)
    return formation

@router.delete("/admin/formations/{formation_id}")
async def admin_delete_formation(
    formation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.full_name != "Administrateur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    formation = db.query(Formation).filter(Formation.id == formation_id).first()
    if not formation:
        raise HTTPException(status_code=404, detail="Formation non trouvée")
    
    db.delete(formation)
    db.commit()
    return {"message": "Formation supprimée"}

# ============ ROUTES ADMIN DATES DE RENTRÉE ============
@router.get("/admin/enrollment-dates")
async def admin_get_enrollment_dates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.full_name != "Administrateur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    dates = db.query(EnrollmentDate).order_by(EnrollmentDate.year).all()
    return dates

@router.post("/admin/enrollment-dates")
async def admin_create_enrollment_date(
    year: str,
    date: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.full_name != "Administrateur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    enrollment_date = EnrollmentDate(year=year, date=date_type.fromisoformat(date))
    db.add(enrollment_date)
    db.commit()
    db.refresh(enrollment_date)
    return enrollment_date

@router.put("/admin/enrollment-dates/{date_id}")
async def admin_update_enrollment_date(
    date_id: int,
    year: str,
    date: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.full_name != "Administrateur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    enrollment_date = db.query(EnrollmentDate).filter(EnrollmentDate.id == date_id).first()
    if not enrollment_date:
        raise HTTPException(status_code=404, detail="Date non trouvée")
    
    enrollment_date.year = year
    enrollment_date.date = date_type.fromisoformat(date)
    db.commit()
    db.refresh(enrollment_date)
    return enrollment_date

@router.delete("/admin/enrollment-dates/{date_id}")
async def admin_delete_enrollment_date(
    date_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.full_name != "Administrateur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    enrollment_date = db.query(EnrollmentDate).filter(EnrollmentDate.id == date_id).first()
    if not enrollment_date:
        raise HTTPException(status_code=404, detail="Date non trouvée")
    
    db.delete(enrollment_date)
    db.commit()
    return {"message": "Date supprimée"}

# ============ ROUTES D'ADMINISTRATION UTILISATEURS ============
@router.post("/admin/users")
async def admin_create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crée un nouvel utilisateur (admin uniquement)"""
    # Vérifier que l'utilisateur actuel est admin
    if current_user.full_name != "Administrateur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # Vérifier si l'email existe déjà
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    # Créer le nouvel utilisateur
    hashed_password = hash_password(user_data.password)
    
    new_user = User(
        email=user_data.email,
        password=hashed_password,
        full_name=user_data.full_name,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "id": new_user.id,
        "email": new_user.email,
        "full_name": new_user.full_name,
        "is_active": new_user.is_active
    }

@router.get("/admin/users")
async def admin_get_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupère tous les utilisateurs (admin uniquement)"""
    if current_user.full_name != "Administrateur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    users = db.query(User).all()
    return [
        {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active
        }
        for user in users
    ]

@router.delete("/admin/users/{user_id}")
async def admin_delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Supprime un utilisateur (admin uniquement)"""
    if current_user.full_name != "Administrateur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # Empêcher la suppression de son propre compte
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    db.delete(user)
    db.commit()
    
    return {"message": "Utilisateur supprimé avec succès"}