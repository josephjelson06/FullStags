# UrgentParts — Emergency Industrial Parts Matching

**UrgentParts** is an intelligent B2B order allocation platform designed to minimize industrial downtime caused by delayed spare parts sourcing. The system matches emergency part orders with the nearest available supplier and computes optimized delivery routes in real time.

## 🚀 Key Features

* **Smart Matching Engine**: Automatically finds the nearest supplier using Haversine distance and drive-time calculations.
* **Role-Based Access**: Dedicated portals for Buyers, Suppliers, and Administrators.
* **Real-Time Routing**: Visualizes delivery routes on interactive maps using Leaflet.
* **Emergency Levels**: Supports Critical, High, and Standard urgency classifications to prioritize orders.
* **Inventory Management**: Full CRUD capabilities for suppliers to manage stock levels.
* **Analytics Dashboard**: Admin insights into matching performance and downtime costs.
* **Modern UI**: Built with React 19 and Tailwind 4, featuring automatic dark mode support.

## 🛠️ Tech Stack

### Frontend
* **Framework**: React 19 + TypeScript
* **Build Tool**: Vite
* **Styling**: Tailwind CSS v4
* **State Management**: Zustand
* **Maps**: Leaflet / React-Leaflet
* **Charts**: Recharts

### Backend
* **Framework**: FastAPI (Python 3.11+)
* **Database**: SQLite (Auto-created on startup)
* **ORM**: SQLAlchemy + aiosqlite
* **Auth**: JWT (JSON Web Tokens) with BCrypt
* **Optimization**: Google OR-Tools (for routing/matching logic)

## 📦 Installation & Setup

### Option A: Quick Start (Windows PowerShell)
If you are on Windows, you can use the provided automation script to launch both services:
```powershell
.\start-demo.ps1
