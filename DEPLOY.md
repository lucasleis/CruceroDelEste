# DEPLOY.md — Expreso Río Paraná

Guía operativa para desplegar el stack completo (backend + frontend + frontend-admin + postgres) en un servidor nuevo, desde cero.

---

## 1. Requisitos previos del servidor

- Docker y Docker Compose v2
- nginx
- Certbot
- Acceso SSH con clave pública cargada en GitHub (para poder clonar el repo)

```bash
docker --version
docker compose version
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

## 2. Clonar el repo

```bash
cd ~
git clone git@github.com:<org>/CruceroDelEste.git
cd ~/CruceroDelEste
```

---

## 3. Variables de entorno

Crear `.env` en la raíz, basado en el ejemplo correspondiente (revisar si existe `.env.example` en la raíz; si no, usar los `.env.example` de cada subproyecto como referencia).

Crear `backend/.env` a partir de `backend/.env.example`:

```bash
cp backend/.env.example backend/.env
```

### ⚠️ Contraseña de Postgres — debe coincidir exactamente

`POSTGRES_PASSWORD` en `.env` (raíz) y las contraseñas embebidas en `DATABASE_URL` y `SYNC_DATABASE_URL` en `backend/.env` **tienen que ser idénticas**. Si no coinciden, el backend no arranca (falla la conexión a la DB). Revisar las tres cada vez que se cambie la contraseña.

Generar contraseñas seguras (hex, sin caracteres especiales que rompan la URL de conexión):

```bash
openssl rand -hex 32
```

### ⚠️ CORS_ORIGINS — formato JSON array

`CORS_ORIGINS` debe ser un JSON array, no una lista separada por comas:

```
CORS_ORIGINS=["https://expresorioparana.nivalistechlab.com","https://admin.expresorioparana.nivalistechlab.com"]
```

### Variables dummy temporales

Hasta recibir credenciales reales, usar valores dummy para no bloquear el arranque:

```
MERCADOPAGO_ACCESS_TOKEN=dummy
MERCADOPAGO_WEBHOOK_SECRET=dummy
RESEND_API_KEY=dummy
```

---

## 4. Build y arranque del stack

```bash
cd ~/CruceroDelEste
docker compose build
docker compose up -d
```

Verificar que el servicio de migraciones (`migrate`) completó exitosamente **antes** de que el backend termine de arrancar:

```bash
docker compose logs migrate
```

Confirmar que los 4 servicios están corriendo y que backend está `healthy`:

```bash
docker compose ps
```

Puertos asignados:

| Servicio | Puerto |
|---|---|
| backend | 8801 |
| frontend | 8802 |
| frontend-admin | 8803 |
| postgres | sin puerto público |

---

## 5. Crear usuario admin

```bash
docker exec expresorioparana-backend-1 python /app/scripts/create_admin.py --email <email> --password <password>
```

---

## 6. Cargar datos iniciales (seat layouts)

Los seat layouts son datos, no schema — no se migran con Alembic. Hay que exportarlos desde el entorno local e importarlos en el servidor.

En local:

```bash
pg_dump -h localhost -U <user> -d <db> --data-only --inserts -t seat_layouts -t seat_layout_seats > seat_layouts.sql
```

Copiar al servidor:

```bash
scp seat_layouts.sql <user>@<server>:~/CruceroDelEste/
```

Importar en el servidor:

```bash
docker exec -i expresorioparana-postgres-1 psql -U <user> -d <db> < seat_layouts.sql
```

---

## 7. DNS (Cloudflare)

El dominio `nivalistechlab.com` usa Cloudflare como DNS activo (nameservers: `joselyn.ns.cloudflare.com`, `benedict.ns.cloudflare.com`).

### ⚠️ Hostinger no tiene efecto

Los registros DNS se editan en `dash.cloudflare.com`, no en el panel de Hostinger. Cambios ahí no hacen nada.

Crear 3 registros A, con **Proxy status en "DNS only" (nube gris, NO proxied)**:

| Subdominio | Apunta a |
|---|---|
| `expresorioparana.nivalistechlab.com` | IP del servidor |
| `api.expresorioparana.nivalistechlab.com` | IP del servidor |
| `admin.expresorioparana.nivalistechlab.com` | IP del servidor |

### ⚠️ CNAME de Vercel

Si `expresorioparana.nivalistechlab.com` tenía un CNAME apuntando a Vercel, eliminarlo primero. No puede coexistir con el registro A nuevo.

Verificar propagación:

```bash
dig +short expresorioparana.nivalistechlab.com
dig +short api.expresorioparana.nivalistechlab.com
dig +short admin.expresorioparana.nivalistechlab.com
```

---

## 8. nginx

Los 3 archivos de configuración están en la raíz del repo: `nginx-expresorioparana.conf`, `nginx-expresorioparana-api.conf`, `nginx-expresorioparana-admin.conf`.

```bash
sudo cp ~/CruceroDelEste/nginx-expresorioparana.conf /etc/nginx/sites-available/
sudo cp ~/CruceroDelEste/nginx-expresorioparana-api.conf /etc/nginx/sites-available/
sudo cp ~/CruceroDelEste/nginx-expresorioparana-admin.conf /etc/nginx/sites-available/

sudo ln -s /etc/nginx/sites-available/nginx-expresorioparana.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/nginx-expresorioparana-api.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/nginx-expresorioparana-admin.conf /etc/nginx/sites-enabled/

sudo nginx -t && sudo systemctl reload nginx
```

---

## 9. Certbot (SSL)

Correr **después** de que el stack Docker esté arriba y el DNS resuelva correctamente (verificado con `dig` en el paso 7).

```bash
sudo certbot --nginx -d expresorioparana.nivalistechlab.com
sudo certbot --nginx -d api.expresorioparana.nivalistechlab.com
sudo certbot --nginx -d admin.expresorioparana.nivalistechlab.com
```

Certbot configura renovación automática — no requiere pasos adicionales.

---

## 10. Verificación final

- Abrir las 3 URLs en el navegador y confirmar respuesta HTTPS:
  - `https://expresorioparana.nivalistechlab.com`
  - `https://api.expresorioparana.nivalistechlab.com`
  - `https://admin.expresorioparana.nivalistechlab.com`
- Confirmar que el selector de asientos muestra el layout del micro (valida que el paso 6 se hizo bien)

```bash
docker compose ps
```

Todos los servicios deben seguir `healthy`.

---

## 11. Cuando lleguen las credenciales reales

Reemplazar en `backend/.env`:

```
MERCADOPAGO_ACCESS_TOKEN=<real>
MERCADOPAGO_WEBHOOK_SECRET=<real>
RESEND_API_KEY=<real>
```

Reiniciar sin rebuild (son variables de runtime):

```bash
docker compose restart backend
```
