"use client";

import { useState } from "react";
import { useCreateAccount } from "@/hooks/useApi";

interface Props {
  onSuccess: () => void;
}

export function AddAccountForm({ onSuccess }: Props) {
  const [form, setForm] = useState({
    name: "",
    platform: "cloudflare",
    token: "",
    email: "",
  });

  const mutation = useCreateAccount();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(
      { ...form, isActive: true },
      {
        onSuccess: () => {
          setForm({ name: "", platform: "cloudflare", token: "", email: "" });
          onSuccess();
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm text-gray-300">نام اکانت</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          placeholder="مثال: حساب اصلی کلودفلر"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-300">پلتفرم</label>
        <select
          value={form.platform}
          onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
        >
          <option value="cloudflare">Cloudflare (کلودفلر)</option>
          <option value="vercel">Vercel (ورسل)</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-300">توکن دسترسی (API Token)</label>
        <input
          required
          type="password"
          value={form.token}
          onChange={(e) => setForm((p) => ({ ...p, token: e.target.value }))}
          data-ltr="true"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          dir="ltr"
          placeholder="API Token"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-300">
          ایمیل <span className="text-gray-500">(اختیاری — برای Cloudflare Global Key)</span>
        </label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          data-ltr="true"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          dir="ltr"
          placeholder="email@example.com"
        />
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-400">
          {mutation.error?.message || "خطا در ثبت اکانت"}
        </p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
      >
        {mutation.isPending ? "در حال ثبت..." : "ثبت اکانت"}
      </button>
    </form>
  );
}
