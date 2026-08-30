import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.auth import router as auth_router
from app.routers.room_types import router as room_types_router
from app.routers.properties import router as properties_router
from app.routers.rooms import router as rooms_router
from app.routers.bookings import router as bookings_router
from app.routers.payments import router as payments_router
from app.routers.reviews import router as reviews_router

allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
).split(",")

app = FastAPI(
    title="Kaveri Hotels API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(properties_router)
app.include_router(room_types_router)
app.include_router(rooms_router)
app.include_router(bookings_router)
app.include_router(payments_router)
app.include_router(reviews_router)

@app.get("/")
def root():
    return {
        "message": "Kaveri Hotels API is running"
    }