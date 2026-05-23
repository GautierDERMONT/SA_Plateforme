@echo off
echo Demarrage de SA Plateforme avec FastAPI + React...

:: Démarrer le backend (plus besoin de seed_db)
start cmd /k "cd backend && venv\Scripts\activate && python run.py"

:: Attendre 3 secondes
timeout /t 3

:: Démarrer le frontend React
start cmd /k "cd frontend && npm start"

echo.
echo Application demarree !
echo Backend FastAPI: http://localhost:5000
echo Documentation: http://localhost:5000/docs
echo Frontend React: http://localhost:3000
echo.