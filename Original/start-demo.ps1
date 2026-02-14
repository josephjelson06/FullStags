# UrgentParts - Demo Launcher
# Run this script from the project root (FullStags/)

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  UrgentParts - Demo Launcher" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Start Backend
Write-Host "[1/3] Starting Backend (FastAPI + SQLite)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoProfile", "-Command", "cd backend; python run.py" -WindowStyle Normal

# Wait for backend
Write-Host "[2/3] Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 4

# Start Frontend
Write-Host "[3/3] Starting Frontend (Vite + React)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoProfile", "-Command", "cd frontend; npm run dev" -WindowStyle Normal

# Wait and open browser
Start-Sleep -Seconds 3
Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "  App is running!" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Demo Credentials:" -ForegroundColor Cyan
Write-Host "  Buyer:    buyer@factory.com / password123"
Write-Host "  Supplier: supplier@parts.com / password123"
Write-Host "  Admin:    admin@urgentparts.com / password123"
Write-Host ""

Start-Process "http://localhost:5173"
