import { describe, it, expect } from "vitest";
import {
  formatDate,
  STATUS_BADGE,
  BOOKING_STATUS_BADGE,
  SEAT_TYPE_LABEL,
  TRIP_STATUS_LABEL,
} from "@/lib/tripUtils";

describe("formatDate", () => {
  it("convierte un instante UTC a la hora de America/Buenos_Aires (-03:00)", () => {
    // arrange: 2026-03-15T12:00:00Z → 09:00 en Buenos Aires
    const iso = "2026-03-15T12:00:00Z";

    // act
    const result = formatDate(iso);

    // assert: dd/mm/yyyy hh:mm en 24h, sin la coma que mete Intl
    expect(result).toBe("15/03/2026 09:00");
  });

  it("no incluye la coma que Intl inserta entre fecha y hora", () => {
    // arrange
    const iso = "2026-01-01T03:00:00Z"; // 00:00 en Buenos Aires

    // act
    const result = formatDate(iso);

    // assert
    expect(result).not.toContain(",");
    expect(result).toBe("01/01/2026 00:00");
  });

  it("cruza el límite de día cuando la conversión de zona retrocede la fecha", () => {
    // arrange: 02:00Z del día 2 es 23:00 del día 1 en Buenos Aires
    const iso = "2026-05-02T02:00:00Z";

    // act
    const result = formatDate(iso);

    // assert
    expect(result).toBe("01/05/2026 23:00");
  });
});

describe("mapas de badges y labels", () => {
  it("cubre exactamente los tres estados de viaje con label y className", () => {
    // arrange / act
    const keys = Object.keys(STATUS_BADGE).sort();

    // assert
    expect(keys).toEqual(["cancelled", "completed", "scheduled"]);
    for (const key of keys) {
      const entry = STATUS_BADGE[key as keyof typeof STATUS_BADGE];
      expect(entry.label).toBeTruthy();
      expect(entry.className).toContain("bg-");
    }
  });

  it("cubre los cuatro estados de reserva del backend", () => {
    // arrange / act
    const keys = Object.keys(BOOKING_STATUS_BADGE).sort();

    // assert
    expect(keys).toEqual([
      "confirmed",
      "expired",
      "pending_payment",
      "refunded",
    ]);
  });

  it("traduce los tipos de asiento a etiquetas legibles", () => {
    // assert
    expect(SEAT_TYPE_LABEL.cama).toBe("Cama");
    expect(SEAT_TYPE_LABEL.semi_cama).toBe("Semi Cama");
  });

  it("deriva TRIP_STATUS_LABEL de los mismos labels que STATUS_BADGE", () => {
    // assert: el label derivado debe coincidir con el del badge para cada estado
    expect(TRIP_STATUS_LABEL.scheduled).toBe(STATUS_BADGE.scheduled.label);
    expect(TRIP_STATUS_LABEL.completed).toBe(STATUS_BADGE.completed.label);
    expect(TRIP_STATUS_LABEL.cancelled).toBe(STATUS_BADGE.cancelled.label);
  });
});
