"use client";

import { useSubLinks } from "@/hooks/useApi";
import { formatBytes, toPersianDate } from "@/lib/utils";

export function SubLinksTable() {
  const { data: subLinks, isLoading } = useSubLinks();

  if (isLoading) return <p className="py-6 text-center text-gray-500">بارگذاری...</p>;
  if (!subLinks?.length) return <p className="py-6 text-center text-gray-500">لینکی ثبت نشده.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-900/50 text-gray-400">
            <th className="px-4 py-3 text-right font-medium">نام</th>
            <th className="px-4 py-3 text-right font-medium">اکانت</th>
            <th className="px-4 py-3 text-right font-medium">URL</th>
            <th className="px-4 py-3 text-center font-medium">ترافیک</th>
            <th className="px-4 py-3 text-center font-medium">انقضا</th>
          </tr>
        </thead>
        <tbody>
          {subLinks.map((s) => {
            const limit = Number(s.trafficLimit);
            const used = Number(s.trafficUsed);
            const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

            return (
              <tr key={s.id} className="border-b border-gray-800/50 transition hover:bg-gray-900/30">
                <td className="px-4 py-3 font-medium text-white">{s.name}</td>
                <td className="px-4 py-3 text-gray-300">{s.account?.name ?? "—"}</td>
                <td className="max-w-[200px] truncate px-4 py-3 font-mono text-xs text-gray-400" dir="ltr">
                  {s.url}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-300">
                      {formatBytes(used)} / {limit > 0 ? formatBytes(limit) : "نامحدود"}
                    </span>
                    {limit > 0 && (
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-800">
                        <div
                          className="h-full rounded-full bg-brand-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-gray-400">
                  {s.expiresAt ? toPersianDate(s.expiresAt) : "نامحدود"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
