"use client";

import { Wifi, Wind, Usb, MonitorPlay, type LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type AmenityType = "wifi" | "ac" | "usb" | "bathroom" | "entertainment";
type AmenityDisplayMode = "icon-only" | "icon-label";

interface AmenityBadgeProps {
  type: AmenityType;
  mode?: AmenityDisplayMode;
  className?: string;
}

function ToiletIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 2.5h5a1 1 0 0 1 1 1V8H5V3.5a1 1 0 0 1 1-1Z" />
      <path d="M4.5 8h8a1 1 0 0 1 1 1v.5a3.5 3.5 0 0 1-1.2 2.64V14a1 1 0 0 1-1 1h-4.6a1 1 0 0 1-1-1v-1.86A3.5 3.5 0 0 1 4.5 9.5V9a1 1 0 0 1 1-1Z" />
      <path d="M7.5 15v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1" />
    </svg>
  );
}

const amenityIcon: Partial<Record<AmenityType, LucideIcon>> = {
  wifi: Wifi,
  ac: Wind,
  usb: Usb,
  entertainment: MonitorPlay,
};

const amenityLabel: Record<AmenityType, string> = {
  wifi: "WiFi",
  ac: "Aire acondicionado",
  usb: "Enchufe USB",
  bathroom: "Baño",
  entertainment: "Entretenimiento",
};

export function AmenityBadge({
  type,
  mode = "icon-label",
  className,
}: AmenityBadgeProps) {
  const Icon = amenityIcon[type];
  const label = amenityLabel[type];

  const renderIcon = (size: number) =>
    type === "bathroom" ? (
      <ToiletIcon size={size} />
    ) : (
      Icon && <Icon size={size} aria-hidden="true" />
    );

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-body)",
  };

  if (mode === "icon-only") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={className}
              style={{
                ...baseStyle,
                justifyContent: "center",
                width: "32px",
                height: "32px",
                borderRadius: "var(--radius-pill)",
              }}
            >
              <span style={{ color: "var(--color-primary)", display: "inline-flex" }}>
                {renderIcon(16)}
              </span>
              <span className="sr-only">{label}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <span
      className={className}
      style={{
        ...baseStyle,
        gap: "6px",
        padding: "6px 10px",
        borderRadius: "var(--radius-sm)",
        fontFamily: "var(--font-body)",
        fontSize: "13px",
      }}
    >
      <span style={{ color: "var(--color-primary)", display: "inline-flex" }}>
        {renderIcon(16)}
      </span>
      {label}
    </span>
  );
}
