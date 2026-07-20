# DEVELOPMENT.md — Guía de setup para desarrollo

## Prerequisitos

- Docker Desktop (corriendo en Windows)
- WSL2 con Ubuntu
- Node.js 20+ (instalado en WSL)
- Python 3.12 (instalado en WSL)
- Git

## Importante: entorno de desarrollo

Todo el desarrollo corre desde WSL. Nunca corras `npm install` ni `pip install` desde PowerShell — los binarios nativos son incompatibles entre Windows y Linux.

La única excepción: Docker corre en Windows (Docker Desktop). WSL se conecta a él via red, no via socket.

---

## 1. Configurar la red WSL2 → Docker

Docker Desktop corre en Windows. Desde WSL, `localhost` no apunta a Windows — hay que usar la IP del gateway.

```bash
# Obtené la IP del host Windows desde WSL
ip route | grep default | awk '{print $3}'
# Ejemplo: 172.29.224.1
```

Usá esa IP en todos los archivos `.env` donde antes diría `localhost` para las conexiones a la DB.

⚠️ Esta IP puede cambiar si reiniciás WSL o Docker. Si el backend no conecta a la DB, volvé a correr este comando y actualizá el `.env`.

---

## 2. Setup del backend

```bash
cd backend

# Crear y activar el venv
python3 -m venv .venv
source .venv/bin/activate

# Instalar dependencias
pip install -e ".[dev]"

# IMPORTANTE: fijar bcrypt a 4.0.1 — versiones superiores son incompatibles con passlib
pip install bcrypt==4.0.1
```

### Variables de entorno

```bash
cp .env.example .env
```

Editá `.env` y reemplazá `localhost` por la IP del gateway de WSL (ver paso 1) en las URLs de DB:
DATABASE_URL=postgresql+asyncpg://crucero:crucero@<IP_GATEWAY>:5432/crucerodeleste
SYNC_DATABASE_URL=postgresql://crucero:crucero@<IP_GATEWAY>:5432/crucerodeleste
SECRET_KEY=<generá uno con: python3 -c "import secrets; print(secrets.token_hex(32))">
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

⚠️ No uses `sed` para reemplazar `localhost` en el `.env` — reemplaza también los orígenes de CORS y los rompe.

### Levantar la DB

```bash
docker run -d --name crucero-pg \
  -e POSTGRES_USER=crucero \
  -e POSTGRES_PASSWORD=crucero \
  -e POSTGRES_DB=crucerodeleste \
  -p 5432:5432 postgres:16
```

### Correr migraciones

```bash
# Actualizar sqlalchemy.url en alembic.ini con la IP del gateway
# Línea 89: sqlalchemy.url = postgresql+asyncpg://crucero:crucero@<IP_GATEWAY>:5432/crucerodeleste
alembic upgrade head
```

### Crear el primer usuario admin

```bash
python -m scripts.create_admin --email admin@example.com --password TuPassword123
```

⚠️ Si el script falla con error de bcrypt, corré `pip install bcrypt==4.0.1` y reintentá.

⚠️ Si necesitás actualizar el hash manualmente en la DB, usá el psql interactivo — nunca el flag `-c` con comillas dobles, porque bash interpreta los `$` del hash como variables de entorno y lo trunca:

```bash
# Correcto: psql interactivo
docker exec -it crucero-pg psql -U crucero -d crucerodeleste
# Dentro de psql:
UPDATE admin_users SET password_hash = '$2b$12$...' WHERE email = 'admin@example.com';
```

### Levantar el servidor

```bash
cd backend

source .venv/bin/activate

uvicorn app.main:app --reload
# Disponible en http://localhost:8000
# Swagger UI en http://localhost:8000/docs
```

---

## 3. Setup del frontend-admin

```bash
cd frontend-admin

# Instalar dependencias (siempre desde WSL)
npm install

# Variables de entorno
cp .env.example .env
# El .env.example ya tiene el valor correcto:
# VITE_API_BASE_URL=http://localhost:8000

# Levantar
npm run dev
# Disponible en http://localhost:5173
```

⚠️ Vite necesita restart completo (Ctrl+C + npm run dev) para tomar cambios en `.env`. El hot reload no aplica a variables de entorno.

---

## 4. Setup del frontend-landing

```bash
cd frontend-landing
# TODO: documentar cuando esté en desarrollo activo
```

---

## Problemas frecuentes

| Problema | Causa | Solución |
|----------|-------|----------|
| `password authentication failed for user "crucero"` en backend | La IP del gateway cambió | Corré `ip route | grep default | awk '{print $3}'` y actualizá `.env` y `alembic.ini` |
| `ValueError: password cannot be longer than 72 bytes` | bcrypt > 4.0.1 instalado | `pip install bcrypt==4.0.1` |
| `hash could not be identified` en login | Hash truncado en DB por uso de `$` en bash | Actualizá el hash via psql interactivo (ver paso 2) |
| Frontend hace requests a su propio puerto | `.env` de Vite no existe o no tiene `VITE_API_BASE_URL` | Crear `frontend-admin/.env` con `VITE_API_BASE_URL=http://localhost:8000` |
| `npm install` falla con binarios nativos incorrectos | Se mezcló instalación desde PowerShell y WSL | `rm -rf node_modules && npm install` desde WSL |

---

## Constraints

- Creá el archivo en la raíz del monorepo: `/DEVELOPMENT.md`
- No modifiques ningún otro archivo
- No agregues ni quites secciones — el contenido es exactamente el de arriba
- Confirmá con ✅ /DEVELOPMENT.md — creado

---

## Levantar el entorno local

### Backend
```bash
wsl
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

### Frontend (público)
```bash
wsl
cd frontend
npm run dev
```

**Si hay redirect infinito:**
```bash
rm -rf .next
npm run dev
```

### Frontend Admin
```bash
wsl
cd frontend-admin
npm run dev
```

### Base de datos (acceso directo)
```bash
docker exec -it crucero-pg psql -U crucero -d crucerodeleste
```

### Migraciones de base de datos
```bash
cd backend
alembic upgrade head
```
Note: requires .env variables loaded. They load automatically via python-dotenv since LLE-133.
