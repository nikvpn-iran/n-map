"use client";

import { useState } from "react";
import { useCreateSubLink, useAccounts } from "@/hooks/useApi";

interface Props {
  onSuccess: () => void;
}

export function AddSubLinkForm({ onSuccess }: Props) {
  const { data: accounts } = useAccounts();
  const [form, setForm] = useState({
    name: "",
    url: "",
    trafficLimit: "0",
    expiresAt: "",
    accountId: "",
  });

  const mutation = useCreateSubLink();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(
      {
        ...form,
        trafficLimit: Number(form.trafficLimit) * 1024 * 1024 * 1024,
        trafficUsed: 0,
        expiresAt: form.expiresAt || "",
      },
      {
        onSuccess: () => {
          setForm({ name: "", url: "", trafficLimit: "0", expiresAt: "", accountId: "" });
          onSuccess();
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm text-gray-300">اکانت</label>
        <select
          required
          value={form.accountId}
          onChange={(e) => setForm((p) => ({ ...p, accountId: e.target.value }))}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
        >
          <option value="">انتخاب اکانت...</option>
          {accounts?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.platform})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-300">نام لینک</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
          placeholder="ساب اصلی"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-300">آدرس URL</label>
        <input
          required
          type="url"
          value={form.url}
          onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
          dir="ltr"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
          placeholder="https://sub.example.com/user123"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm text-gray-300">سقف ترافیک (GB)</label>
          <input
            type="number"
            min={0}
            value={form.trafficLimit}
            onChange={(e) => setForm((p) => ({ ...p, trafficLimit: e.target.value }))}
            dir="ltr"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
            placeholder="0 = نامحدود"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-300">تاریخ انقضا</label>
          <input
            type="date"
            value={form.expiresAt}
            onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
            dir="ltr"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-400">{mutation.error?.message || "خطا"}</p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700 disabled:opacity-50"
      >
        {mutation.isPending ? "در حال ثبت..." : "افزودن لینک ساب"}
      </button>
    </form>
  );
}
