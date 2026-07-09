"""Seed script for the stops table (LLE-146).

Usage (from backend/):
    python -m scripts.seed_stops
"""

import asyncio
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load .env before importing app.config (Settings reads env vars at import time).
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.dialects.postgresql import insert as pg_insert  # noqa: E402

from app.database import AsyncSessionLocal  # noqa: E402
from app.models.trip import CountryEnum, Stop  # noqa: E402

STOPS: list[tuple[str, CountryEnum, str]] = [
    # Argentina (AR)
    ("Constitución CABA", CountryEnum.AR, "Ciudad Autónoma de Buenos Aires"),
    ("Terminal Retiro", CountryEnum.AR, "Ciudad Autónoma de Buenos Aires"),
    ("Terminal Pacheco", CountryEnum.AR, "Buenos Aires"),
    ("Parador Escobar", CountryEnum.AR, "Buenos Aires"),
    ("Terminal Campana", CountryEnum.AR, "Buenos Aires"),
    ("La Plata", CountryEnum.AR, "Buenos Aires"),
    ("Varela", CountryEnum.AR, "Buenos Aires"),
    ("Solano Ag 24 y Monteverde", CountryEnum.AR, "Buenos Aires"),
    ("Burzaco Rot. Vapor", CountryEnum.AR, "Buenos Aires"),
    ("La Noria Terminal", CountryEnum.AR, "Ciudad Autónoma de Buenos Aires"),
    ("San Justo", CountryEnum.AR, "Buenos Aires"),
    ("Terminal Liniers", CountryEnum.AR, "Ciudad Autónoma de Buenos Aires"),
    ("Santa Rosa (Misiones)", CountryEnum.AR, "Misiones"),
    # Paraguay (PY)
    ("Terminal Encarnación", CountryEnum.PY, "Itapúa"),
    ("Transfer Terminal Encarnación", CountryEnum.PY, "Itapúa"),
    ("Encarnación Jesuita Av. Caball", CountryEnum.PY, "Itapúa"),
    ("Carmen del Paraná Agencia", CountryEnum.PY, "Itapúa"),
    ("Terminal Cnel. Bogado", CountryEnum.PY, "Itapúa"),
    ("General Delgado", CountryEnum.PY, "Itapúa"),
    ("Tambory", CountryEnum.PY, "Misiones"),
    ("San Patricio", CountryEnum.PY, "Misiones"),
    ("San Ignacio Plaza San Roque", CountryEnum.PY, "Misiones"),
    ("San Juan Bautista (Curva)", CountryEnum.PY, "Misiones"),
    ("San Miguel", CountryEnum.PY, "Misiones"),
    ("Villa Florida Parador Touring", CountryEnum.PY, "Misiones"),
    ("Caapucú Mendaval", CountryEnum.PY, "Paraguarí"),
    ("Quiindy", CountryEnum.PY, "Paraguarí"),
    ("Roque González Ag. BL", CountryEnum.PY, "Paraguarí"),
    ("Carapeguá Rolón", CountryEnum.PY, "Paraguarí"),
    ("Carapeguá Narciza", CountryEnum.PY, "Paraguarí"),
    ("Carapeguá Jumbo", CountryEnum.PY, "Paraguarí"),
    ("Paraguarí", CountryEnum.PY, "Paraguarí"),
    ("Yaguarón Ag. Las Palmeras", CountryEnum.PY, "Paraguarí"),
    ("Itá", CountryEnum.PY, "Central"),
    ("San Lorenzo PY", CountryEnum.PY, "Central"),
    ("Asunción Terminal", CountryEnum.PY, "Asunción"),
    ("Capitán Miranda", CountryEnum.PY, "Itapúa"),
    ("Cruce Hohenau", CountryEnum.PY, "Itapúa"),
    ("Bella Vista Itapúa", CountryEnum.PY, "Itapúa"),
    ("Cruce Edelira Km 28", CountryEnum.PY, "Itapúa"),
    ("María Auxiliadora", CountryEnum.PY, "Itapúa"),
    ("Cruce Iruna", CountryEnum.PY, "Alto Paraná"),
    ("Terminal Santa Rita", CountryEnum.PY, "Alto Paraná"),
    ("Km 30 CDE", CountryEnum.PY, "Alto Paraná"),
    ("Transfer Ciudad del Este", CountryEnum.PY, "Alto Paraná"),
    ("Terminal Ciudad del Este", CountryEnum.PY, "Alto Paraná"),
    ("Terminal Mallorquín", CountryEnum.PY, "Alto Paraná"),
    ("CDE (Oleary)", CountryEnum.PY, "Caaguazú"),
    ("CDE (José Domingo Ocampo)", CountryEnum.PY, "Caaguazú"),
    ("CDE (Campo 9)", CountryEnum.PY, "Caaguazú"),
    ("Terminal Caaguazú", CountryEnum.PY, "Caaguazú"),
    ("Terminal Coronel Oviedo", CountryEnum.PY, "Caaguazú"),
    ("Villarrica Terminal", CountryEnum.PY, "Guairá"),
    ("Cruce Tavapy", CountryEnum.PY, "Alto Paraná"),
    ("Terminal Km9 CDE", CountryEnum.PY, "Alto Paraná"),
]


async def seed_stops() -> None:
    deduped: dict[tuple[str, CountryEnum], str] = {}
    for name, country, province in STOPS:
        deduped.setdefault((name, country), province)

    inserted = 0
    skipped = 0

    async with AsyncSessionLocal() as session:
        for (name, country), province in deduped.items():
            stmt = (
                pg_insert(Stop)
                .values(name=name, country=country, province=province)
                .on_conflict_do_nothing(index_elements=["name"])
                .returning(Stop.id)
            )
            result = await session.execute(stmt)
            if result.first() is not None:
                inserted += 1
            else:
                skipped += 1
        await session.commit()

    print(f"Stops inserted: {inserted}")
    print(f"Stops skipped (already existed): {skipped}")
    print(f"Total processed: {inserted + skipped}")


if __name__ == "__main__":
    asyncio.run(seed_stops())
