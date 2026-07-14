"use client";

import { useState, useCallback } from "react";
import { useCreateAccount, useVerifyToken } from "@/hooks/useApi";
import { getTokenUrl, platformLabel } from "@/lib/utils";
import {
  ExternalLink,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Cloud,
  Triangle,
} from "lucide-react";

interface Props {
  onSuccess: () => void;
}

const PLATFORMS = [
  { id: "cloudflare", label: "Cloudflare", icon: Cloud, color: "bg-orange-500/10 border-orange-500/30 text-orange-400" },
  { id: "vercel", label: "Vercel", icon: Triangle, color: "bg-white/5 border-white/20 text-white" },
];

export function AddAccountForm({ onSuccess }: Props) {
  const [platform, setPlatform] = useState("cloudflare");
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showToken, setShowToken] = useState(false);

  const verifyMutation = useVerifyToken();
  const createMutation = useCreateAccount();

  const isVerified = verifyMutation.data?.valid === true;

  const handleVerify = useCallback(() => {
    if (!token.trim()) return;
    verifyMutation.mutate({ token: token.trim(), platform });
  }, [token, platform, verifyMutation]);

  const handleTokenChange = (val: string) => {
    setToken(val);
    verifyMutation.reset();
  };

  const handlePlatformChange = (p: string) => {
    setPlatform(p);
    setToken("");
    setName("");
    verifyMutation.reset();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) return;

    const finalName = name.trim() || `${platformLabel(platform)} ${Date.now().toString().slice(-4)}`;

    createMutation.mutate(
      {
        name: finalName,
        platform,
        token: token.trim(),
        email: email || "",
        isActive: true,
        accountExternalId: verifyMutation.data?.accountExternalId || "",
      },
      {
        onSuccess: () => {
          setToken("");
          setName("");
          setEmail("");
          verifyMutation.reset();
          onSuccess();
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* مرحله ۱: انتخاب پلتفرم */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-300">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">۱</span>
          <span className="mr-2">پلتفرم را انتخاب کنید</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePlatformChange(p.id)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition
                ${platform === p.id
                  ? p.color + " ring-1 ring-current"
                  : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600"
                }`}
            >
              <p.icon className="h-5 w-5" />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* مرحله ۲: دریافت توکن */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-300">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">۲</span>
          <span className="mr-2">توکن دسترسی را دریافت کنید</span>
        </label>

        <a
          href={getTokenUrl(platform)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-500/40 bg-brand-500/5 px-4 py-3 text-sm font-bold text-brand-400 transition hover:border-brand-400 hover:bg-brand-500/10"
        >
          <ExternalLink className="h-4 w-4" />
          دریافت توکن {platformLabel(platform)}
        </a>

        <div className="mt-2 rounded-lg bg-gray-800/50 px-3 py-2 text-[11px] leading-5 text-gray-500">
          {platform === "cloudflare" ? (
            <>
              ۱. روی دکمه بالا کلیک کنید (باید در کلودفلر لاگین باشید)
              <br />
              ۲. در صفحه باز شده پرمیشن‌ها آماده است — فقط <strong className="text-gray-400">Continue to summary</strong> بزنید
              <br />
              ۳. <strong className="text-gray-400">Create Token</strong> بزنید و توکن را کپی کنید
            </>
          ) : (
            <>
              ۱. روی دکمه بالا کلیک کنید (باید در ورسل لاگین باشید)
              <br />
              ۲. روی <strong className="text-gray-400">Create</strong> بزنید و توکن جدید بسازید
              <br />
              ۳. توکن را کپی کنید
            </>
          )}
        </div>
      </div>

      {/* مرحله ۳: وارد کردن توکن */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-300">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">۳</span>
          <span className="mr-2">توکن را وارد کنید</span>
        </label>

        <div className="relative">
          <input
            required
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => handleTokenChange(e.target.value)}
            dir="ltr"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 pl-20 pr-3 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            placeholder="توکن را اینجا paste کنید"
          />
          <div className="absolute left-1 top-1 flex gap-1">
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-700 hover:text-gray-300"
              title={showToken ? "مخفی کردن" : "نمایش"}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={async () => {
                const text = await navigator.clipboard.readText();
                handleTokenChange(text);
              }}
              className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-700 hover:text-gray-300"
              title="Paste از کلیپبورد"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* دکمه بررسی */}
        {token.trim() && !isVerified && (
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifyMutation.isPending}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-700 disabled:opacity-50"
          >
            {verifyMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال بررسی توکن...
              </>
            ) : (
              "بررسی اعتبار توکن"
            )}
          </button>
        )}

        {/* نتیجه بررسی */}
        {verifyMutation.data && (
          <div
            className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              isVerified
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {isVerified ? (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  توکن معتبر است
                  {verifyMutation.data.accountName && (
                    <> — <strong>{verifyMutation.data.accountName}</strong></>
                  )}
                </span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 shrink-0" />
                <span>{verifyMutation.data.error || "توکن نامعتبر است"}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* فیلدهای تکمیلی (فقط بعد از تایید توکن) */}
      {isVerified && (
        <div className="space-y-3 rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <div>
            <label className="mb-1 block text-sm text-gray-300">نام اکانت (اختیاری)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500"
              placeholder={`مثال: ${platformLabel(platform)} اصلی`}
            />
          </div>

          {platform === "cloudflare" && (
            <div>
              <label className="mb-1 block text-sm text-gray-300">
                ایمیل <span className="text-gray-500">(اختیاری)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500"
                placeholder="email@example.com"
              />
            </div>
          )}
        </div>
      )}

      {createMutation.isError && (
        <p className="text-sm text-red-400">
          {createMutation.error?.message || "خطا در ثبت اکانت"}
        </p>
      )}

      <button
        type="submit"
        disabled={!isVerified || createMutation.isPending}
        className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {createMutation.isPending ? "در حال ثبت..." : "ثبت اکانت"}
      </button>
    </form>
  );
}
