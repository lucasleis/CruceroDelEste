from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.errors import register_exception_handlers
from app.routers import admin, bookings, payments, trips
from tasks.reminders import scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="Crucero Del Este API", lifespan=lifespan)

register_exception_handlers(app)

app.include_router(payments.router)
app.include_router(bookings.router)
app.include_router(trips.router)
app.include_router(admin.router)
