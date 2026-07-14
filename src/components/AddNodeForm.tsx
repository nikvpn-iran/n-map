"use client";

import { useState } from "react";
import { useCreateNode, useAccounts } from "@/hooks/useApi";

interface Props {
  onSuccess: () => void;
}

export function AddNodeForm({ onSuccess }: Props) {
  const { data: accounts } = useAccounts();
  const [form, setForm] = useState({
    name: "",
    ip: "",
    port: "",
    type: "vless",
    configLink: "",
    accountId: "",
  });

  const mutation = useCreateNode();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(
      { ...form, port: Number(form.port) },
      {
        onSuccess: () => {
          setForm({ name: "", ip: "", port: "", type: "vless", configLink: "", accountId: "" });
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm text-gray-300">نام نود</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
            placeholder="DE-Node-1"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-300">نوع</label>
          <select
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
          >
            <option value="vless">VLESS</option>
            <option value="vmess">VMess</option>
            <option value="trojan">Trojan</option>
            <option value="shadowsocks">Shadowsocks</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm text-gray-300">آی‌پی</label>
          <input
            required
            value={form.ip}
            onChange={(e) => setForm((p) => ({ ...p, ip: e.target.value }))}
            dir="ltr"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
            placeholder="1.2.3.4"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-300">پورت</label>
          <input
            required
            type="number"
            min={1}
            max={65535}
            value={form.port}
            onChange={(e) => setForm((p) => ({ ...p, port: e.target.value }))}
            dir="ltr"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
            placeholder="443"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-300">لینک کانفیگ (اختیاری)</label>
        <input
          value={form.configLink}
          onChange={(e) => setForm((p) => ({ ...p, configLink: e.target.value }))}
          dir="ltr"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
          placeholder="vless://..."
        />
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-400">{mutation.error?.message || "خطا"}</p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {mutation.isPending ? "در حال ثبت..." : "افزودن نود"}
      </button>
    </form>
  );
}
