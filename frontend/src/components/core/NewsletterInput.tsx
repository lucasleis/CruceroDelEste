"use client";

import { useState } from "react";

const ArrowUpRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
  </svg>
);

interface NewsletterInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}

export function NewsletterInput({
  value,
  onChange,
  onSubmit,
  placeholder = "tu_email@gmail.com",
}: NewsletterInputProps) {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

  const btnStyle: React.CSSProperties =
    active
      ? { background: "#0a1650", transform: "translateY(0px)" }
      : hovered
      ? { background: "#0f1f74", transform: "translateY(-1px)" }
      : {};

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <input
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          flex: 1,
          background: "rgba(255,255,255,0.85)",
          border: `1px solid ${focused ? "var(--color-primary)" : "var(--color-border)"}`,
          borderRadius: "var(--radius-pill)",
          padding: "12px 20px",
          fontFamily: "var(--font-body)",
          fontSize: "16px",
          color: "var(--color-text-muted)",
          outline: "none",
          transition: `all var(--duration-base) var(--ease-out)`,
        }}
      />
      <button
        onClick={onSubmit}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setActive(false); }}
        onMouseDown={() => setActive(true)}
        onMouseUp={() => setActive(false)}
        style={{
          width: "48px",
          height: "48px",
          flexShrink: 0,
          background: "var(--color-primary)",
          color: "var(--color-white)",
          border: "none",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: `all var(--duration-base) var(--ease-out)`,
          ...btnStyle,
        }}
      >
        <ArrowUpRightIcon />
      </button>
    </div>
  );
}
