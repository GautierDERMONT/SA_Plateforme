from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

# Modèle de données Pydantic (validation automatique)
class Item(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

class ItemCreate(BaseModel):
    name: str
    description: Optional[str] = None

# Base de données temporaire (simulée)
items_db = [
    {"id": 1, "name": "Item 1", "description": "Description 1"},
    {"id": 2, "name": "Item 2", "description": "Description 2"}
]

@router.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Backend FastAPI is running"}

@router.get("/data", response_model=List[Item])
async def get_data():
    """Récupère tous les items"""
    return items_db

@router.get("/data/{item_id}", response_model=Item)
async def get_item(item_id: int):
    """Récupère un item par son ID"""
    for item in items_db:
        if item["id"] == item_id:
            return item
    raise HTTPException(status_code=404, detail="Item not found")

@router.post("/data", response_model=Item)
async def create_item(item: ItemCreate):
    """Crée un nouvel item"""
    new_id = max([i["id"] for i in items_db]) + 1 if items_db else 1
    new_item = {"id": new_id, **item.dict()}
    items_db.append(new_item)
    return new_item

@router.put("/data/{item_id}", response_model=Item)
async def update_item(item_id: int, item: ItemCreate):
    """Met à jour un item"""
    for i, existing_item in enumerate(items_db):
        if existing_item["id"] == item_id:
            items_db[i] = {"id": item_id, **item.dict()}
            return items_db[i]
    raise HTTPException(status_code=404, detail="Item not found")

@router.delete("/data/{item_id}")
async def delete_item(item_id: int):
    """Supprime un item"""
    for i, item in enumerate(items_db):
        if item["id"] == item_id:
            items_db.pop(i)
            return {"message": "Item deleted"}
    raise HTTPException(status_code=404, detail="Item not found")