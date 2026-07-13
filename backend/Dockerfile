FROM python:3.12-slim AS builder

RUN pip install --no-cache-dir uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY . .
RUN uv sync --frozen --no-dev

FROM python:3.12-slim AS runtime

WORKDIR /app
COPY --from=builder /app /app
ENV PATH="/app/.venv/bin:$PATH"

RUN adduser --disabled-password --gecos "" appuser
USER appuser

EXPOSE 8000

# workers=1 obligatorio — APScheduler corre dentro del proceso, múltiples workers causarían jobs duplicados
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
