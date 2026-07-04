"use client";

import { Wifi, Wind, Usb, Bath, MonitorPlay, type LucideIcon } from "lucide-react";
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

const amenityIcon: Record<AmenityType, LucideIcon> = {
  wifi: Wifi,
  ac: Wind,
  usb: Usb,
  bathroom: Bath,
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
              <Icon
                size={16}
                color="var(--color-primary)"
                aria-hidden="true"
              />
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
      <Icon size={16} color="var(--color-primary)" aria-hidden="true" />
      {label}
    </span>
  );
}
