from contextlib import asynccontextmanager

from fastapi import FastAPI
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.errors import register_exception_handlers
from app.routers import admin, bookings, payments, trips
from tasks.reminders import register_jobs, scheduler

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.start()
    register_jobs()
    yield
    scheduler.shutdown()


app = FastAPI(title="Crucero Del Este API", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

register_exception_handlers(app)

app.include_router(payments.router)
app.include_router(bookings.router)
app.include_router(trips.router)
app.include_router(admin.router)
