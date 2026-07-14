"use client";

import { useAccounts, useDeleteAccount } from "@/hooks/useApi";
import { platformLabel, toPersianDate } from "@/lib/utils";
import { Trash2, Power, PowerOff } from "lucide-react";

export function AccountsTable() {
  const { data: accounts, isLoading } = useAccounts();
  const deleteMutation = useDeleteAccount();

  if (isLoading) {
    return <p className="py-8 text-center text-gray-500">در حال بارگذاری...</p>;
  }

  if (!accounts?.length) {
    return (
      <p className="py-8 text-center text-gray-500">
        هنوز اکانتی ثبت نشده. از دکمه بالا اکانت جدید اضافه کنید.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-900/50 text-gray-400">
            <th className="px-4 py-3 text-right font-medium">نام</th>
            <th className="px-4 py-3 text-right font-medium">پلتفرم</th>
            <th className="px-4 py-3 text-center font-medium">نودها</th>
            <th className="px-4 py-3 text-center font-medium">لینک‌ها</th>
            <th className="px-4 py-3 text-center font-medium">وضعیت</th>
            <th className="px-4 py-3 text-right font-medium">تاریخ ثبت</th>
            <th className="px-4 py-3 text-center font-medium">عملیات</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr
              key={a.id}
              className="border-b border-gray-800/50 transition hover:bg-gray-900/30"
            >
              <td className="px-4 py-3 font-medium text-white">{a.name}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-300">
                  {platformLabel(a.platform)}
                </span>
              </td>
              <td className="px-4 py-3 text-center text-gray-300">
                {a._count?.nodes ?? 0}
              </td>
              <td className="px-4 py-3 text-center text-gray-300">
                {a._count?.subLinks ?? 0}
              </td>
              <td className="px-4 py-3 text-center">
                {a.isActive ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <Power className="h-3.5 w-3.5" /> فعال
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-red-400">
                    <PowerOff className="h-3.5 w-3.5" /> غیرفعال
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-400">{toPersianDate(a.createdAt)}</td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => {
                    if (confirm("آیا از حذف این اکانت مطمئنید؟"))
                      deleteMutation.mutate(a.id);
                  }}
                  className="rounded-lg p-1.5 text-gray-500 transition hover:bg-red-500/10 hover:text-red-400"
                  title="حذف"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
