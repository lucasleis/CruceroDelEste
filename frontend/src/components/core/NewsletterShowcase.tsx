"use client";

import { useState } from "react";
import { NewsletterInput } from "./NewsletterInput";

export function NewsletterShowcase() {
  const [email, setEmail] = useState("");
  return (
    <div
      style={{
        background: "var(--color-navy)",
        borderRadius: "var(--radius-md)",
        padding: "32px",
      }}
    >
      <NewsletterInput
        value={email}
        onChange={setEmail}
        onSubmit={() => alert(`Suscripto: ${email}`)}
      />
    </div>
  );
}
