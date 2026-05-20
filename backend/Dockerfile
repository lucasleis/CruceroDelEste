FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml .

RUN pip install --no-cache-dir \
    "fastapi>=0.100" \
    "uvicorn[standard]>=0.20" \
    "sqlalchemy[asyncio]>=2.0" \
    "asyncpg>=0.27" \
    "alembic>=1.10" \
    "pydantic-settings>=2.0" \
    "pydantic[email]>=2.0" \
    "mercadopago>=2.0" \
    "resend>=0.5" \
    "jinja2>=3.1" \
    "PyJWT>=2.6" \
    "passlib[bcrypt]>=1.7" \
    "apscheduler>=3.10,<4.0" \
    "psycopg2-binary>=2.9"

COPY . .

RUN adduser --disabled-password --gecos "" appuser
USER appuser

EXPOSE 8000

# workers=1 obligatorio — APScheduler corre dentro del proceso, múltiples workers causarían jobs duplicados
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
