import React from "react";
import { cn } from "../lib/utils";
import type { EdgeDevice, DeviceType, DeviceStatus } from "../lib/types";
import {
  Cpu,
  Smartphone,
  Monitor,
  Camera,
  Server,
  Laptop,
  Wifi,
} from "lucide-react";

interface DeviceNodeProps {
  device: EdgeDevice;
  isHub?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

const deviceIcons: Record<DeviceType, React.ElementType> = {
  raspberry_pi: Cpu,
  jetson: Server,
  phone: Smartphone,
  camera: Camera,
  mac: Laptop,
  linux: Monitor,
  windows: Monitor,
};

const statusColors: Record<DeviceStatus, { dot: string; ring: string; text: string; bg: string }> = {
  online: {
    dot: "bg-[#22c55e]",
    ring: "ring-[#22c55e]/20",
    text: "text-[#22c55e]",
    bg: "bg-[#22c55e]/10",
  },
  offline: {
    dot: "bg-[#6b7280]",
    ring: "ring-[#6b7280]/20",
    text: "text-[#6b7280]",
    bg: "bg-[#6b7280]/10",
  },
  degraded: {
    dot: "bg-[#eab308]",
    ring: "ring-[#eab308]/20",
    text: "text-[#eab308]",
    bg: "bg-[#eab308]/10",
  },
};

function MiniStatBar({ value, label, color = "#20808D" }: { value: number; label: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[8px] text-[#6b7280]">{label}</span>
        <span className="text-[8px] font-mono text-[#9ca3af]">{value}%</span>
      </div>
      <div className="h-1 w-full bg-[#374151] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, value)}%`,
            backgroundColor: value > 85 ? "#ef4444" : value > 65 ? "#eab308" : color,
          }}
        />
      </div>
    </div>
  );
}

export function DeviceNode({ device, isHub = false, isSelected = false, onClick }: DeviceNodeProps) {
  const Icon = deviceIcons[device.deviceType] ?? Server;
  const colors = statusColors[device.status];

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl",
        "border transition-all duration-200 cursor-pointer",
        "hover:scale-105 active:scale-100 focus:outline-none",
        isHub
          ? "w-24 bg-[#1f2937] border-[#20808D]/40 shadow-lg shadow-[#20808D]/10"
          : "w-[76px] bg-[#111827] border-[#374151]",
        isSelected
          ? "border-[#06b6d4] ring-2 ring-[#06b6d4]/30 bg-[#06b6d4]/5"
          : cn("hover:border-[#4b5563]", isHub && "hover:border-[#20808D]/60"),
        device.status === "offline" && "opacity-60"
      )}
      aria-label={`${device.name} (${device.status})`}
    >
      {/* Status indicator */}
      <div
        className={cn(
          "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0a0f1a] z-10",
          colors.dot
        )}
      >
        {device.status === "online" && (
          <span
            className={cn(
              "absolute inset-0 rounded-full animate-ping opacity-75",
              colors.dot
            )}
          />
        )}
      </div>

      {/* Device icon */}
      <div
        className={cn(
          "rounded-lg flex items-center justify-center",
          isHub ? "w-10 h-10" : "w-8 h-8",
          isHub ? "bg-[#20808D]/20 border border-[#20808D]/30" : colors.bg
        )}
      >
        <Icon
          size={isHub ? 20 : 16}
          className={isHub ? "text-[#20808D]" : colors.text}
        />
      </div>

      {/* Device name */}
      <span
        className={cn(
          "font-medium text-center leading-tight w-full truncate",
          isHub ? "text-[11px] text-[#f9fafb]" : "text-[9px] text-[#d1d5db]"
        )}
      >
        {device.name}
      </span>

      {/* Mini stats */}
      {device.status !== "offline" && (
        <div className="w-full flex flex-col gap-0.5 mt-0.5">
          <MiniStatBar
            value={device.telemetry.cpuPercent}
            label="CPU"
            color={isHub ? "#20808D" : "#06b6d4"}
          />
          <MiniStatBar
            value={device.telemetry.memoryPercent}
            label="MEM"
            color={isHub ? "#20808D" : "#06b6d4"}
          />
          {device.telemetry.temperatureCelsius > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-[#6b7280]">TEMP</span>
              <span
                className={cn(
                  "text-[8px] font-mono",
                  device.telemetry.temperatureCelsius > 80
                    ? "text-[#ef4444]"
                    : device.telemetry.temperatureCelsius > 65
                    ? "text-[#eab308]"
                    : "text-[#9ca3af]"
                )}
              >
                {device.telemetry.temperatureCelsius.toFixed(0)}°C
              </span>
            </div>
          )}
        </div>
      )}

      {/* Hub badge */}
      {isHub && (
        <span className="absolute -bottom-2 bg-[#20808D] text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
          HUB
        </span>
      )}
    </button>
  );
}
