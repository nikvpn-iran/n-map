import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number | bigint): string {
  const b = Number(bytes);
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function toPersianDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function platformLabel(platform: string): string {
  const map: Record<string, string> = {
    cloudflare: "کلودفلر",
    vercel: "ورسل",
  };
  return map[platform.toLowerCase()] ?? platform;
}

export function getTokenUrl(platform: string): string {
  if (platform === "cloudflare") {
    const permissions = JSON.stringify([
      { key: "workers_scripts", type: "edit" },
      { key: "workers_kv_storage", type: "edit" },
      { key: "d1", type: "edit" },
      { key: "account_settings", type: "read" },
      { key: "workers_subdomain", type: "edit" },
      { key: "account_analytics", type: "read" },
    ]);
    return `https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=${encodeURIComponent(permissions)}&accountId=*&zoneId=all&name=N-MAP-Token`;
  }
  if (platform === "vercel") {
    return "https://vercel.com/account/tokens";
  }
  return "#";
}
