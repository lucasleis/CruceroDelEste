from fastapi import FastAPI

from app.errors import register_exception_handlers
from app.routers import bookings, payments

app = FastAPI(title="Crucero Del Este API")

register_exception_handlers(app)

app.include_router(payments.router)
app.include_router(bookings.router)
