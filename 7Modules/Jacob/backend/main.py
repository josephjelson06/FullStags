from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import init_db
from backend.routers import (
    auth,
    deliveries,
    inventory,
    matching,
    notifications,
    orders,
    suppliers,
    users,
    analytics,
)

app = FastAPI(title="Industrial Spare Parts Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"] ,
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(suppliers.router)
app.include_router(inventory.router)
app.include_router(orders.router)
app.include_router(matching.router)
app.include_router(deliveries.router)
app.include_router(notifications.router)
app.include_router(analytics.router)


@app.on_event("startup")
async def on_startup() -> None:
    await init_db()
