"use client";

import { useNodes } from "@/hooks/useApi";
import { toPersianDate } from "@/lib/utils";
import { Wifi, WifiOff, CircleHelp } from "lucide-react";

const healthIcon = {
  healthy: <Wifi className="h-3.5 w-3.5 text-emerald-400" />,
  unhealthy: <WifiOff className="h-3.5 w-3.5 text-red-400" />,
  unknown: <CircleHelp className="h-3.5 w-3.5 text-gray-500" />,
};

export function NodesTable() {
  const { data: nodes, isLoading } = useNodes();

  if (isLoading) return <p className="py-6 text-center text-gray-500">بارگذاری...</p>;
  if (!nodes?.length) return <p className="py-6 text-center text-gray-500">نودی ثبت نشده.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-900/50 text-gray-400">
            <th className="px-4 py-3 text-right font-medium">نام</th>
            <th className="px-4 py-3 text-right font-medium">اکانت</th>
            <th className="px-4 py-3 text-center font-medium">آی‌پی : پورت</th>
            <th className="px-4 py-3 text-center font-medium">نوع</th>
            <th className="px-4 py-3 text-center font-medium">وضعیت</th>
            <th className="px-4 py-3 text-right font-medium">تاریخ</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((n) => (
            <tr key={n.id} className="border-b border-gray-800/50 transition hover:bg-gray-900/30">
              <td className="px-4 py-3 font-medium text-white">{n.name}</td>
              <td className="px-4 py-3 text-gray-300">{n.account?.name ?? "—"}</td>
              <td className="px-4 py-3 text-center font-mono text-gray-300" dir="ltr">
                {n.ip}:{n.port}
              </td>
              <td className="px-4 py-3 text-center">
                <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs uppercase text-gray-300">
                  {n.type}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="inline-flex items-center gap-1">
                  {healthIcon[n.healthStatus as keyof typeof healthIcon] ?? healthIcon.unknown}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-400">{toPersianDate(n.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
