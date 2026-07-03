"""CLI: crea un admin_user con password hasheada. Uso:
python -m scripts.create_admin --email admin@expresorioparana.com --password <password>
"""

import argparse
import sys
import uuid

from passlib.context import CryptContext
from sqlalchemy import create_engine, text

from app.config import settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def main() -> None:
    parser = argparse.ArgumentParser(description="Crea un usuario admin en admin_users")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    engine = create_engine(settings.sync_database_url)
    password_hash = _pwd_context.hash(args.password)
    admin_id = uuid.uuid4()

    with engine.begin() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM admin_users WHERE email = :email"),
            {"email": args.email},
        ).first()
        if exists:
            print(f"Error: ya existe un admin con email {args.email!r}", file=sys.stderr)
            sys.exit(1)

        conn.execute(
            text(
                "INSERT INTO admin_users (id, email, password_hash, created_at) "
                "VALUES (:id, :email, :password_hash, now())"
            ),
            {"id": admin_id, "email": args.email, "password_hash": password_hash},
        )

    print(f"Admin creado: id={admin_id} email={args.email}")


if __name__ == "__main__":
    main()
