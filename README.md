<div align="center">

<img src="logo.jpg" alt="NikVPN Logo" width="120" />

# N-MAP

**nikvpn multi api panel**

مدیریت همزمان چندین اکانت API از پلتفرم‌های مختلف

[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)

</div>

---

## امکانات

- مدیریت **نامحدود اکانت API** از پلتفرم‌های مختلف (مثلاً ۳ Cloudflare + ۲ Vercel)
- دریافت توکن **با یک کلیک** — پرمیشن‌ها از قبل آماده‌اند
- **اعتبارسنجی خودکار** توکن قبل از ذخیره
- معماری **اصلی/ثانویه** — توکن اول برای زیرساخت، بقیه برای ریکوئست رایگان
- مدیریت **نودهای پروکسی** (VLESS / VMess / Trojan / Shadowsocks)
- مدیریت **لینک‌های ساب** با کنترل ترافیک و انقضا
- داشبورد **لحظه‌ای** — آمار بدون رفرش آپدیت می‌شود
- رابط کاربری **فارسی RTL** — تم تیره، ریسپانسیو

## نصب

```bash
git clone https://github.com/nikvpn-iran/n-map.git
cd n-map
npm install
npx prisma migrate dev
npm run dev
```

پنل روی `http://localhost:3000` اجرا می‌شود.

## نحوه اضافه کردن اکانت

۱. روی **«افزودن اکانت API»** کلیک کنید

۲. پلتفرم (Cloudflare یا Vercel) را انتخاب کنید

۳. روی **«دریافت توکن»** بزنید — به صفحه ساخت توکن با پرمیشن‌های آماده هدایت می‌شوید

۴. توکن را کپی و در پنل paste کنید — اعتبارسنجی خودکار انجام می‌شود

۵. **ثبت اکانت** — اولین اکانت به‌عنوان «اصلی» تنظیم می‌شود

> اکانت‌های بعدی به‌عنوان «ثانویه» اضافه می‌شوند و فقط از ریکوئست‌های رایگان روزانه پلتفرم استفاده می‌کنند.

## دستورات

| دستور | عملکرد |
|-------|--------|
| `npm run dev` | سرور توسعه |
| `npm run build` | بیلد پروداکشن |
| `npm start` | اجرای پروداکشن |
| `npm run db:migrate` | مایگریشن دیتابیس |
| `npm run db:seed` | وارد کردن داده نمونه |

## API

| متد | مسیر | عملکرد |
|-----|------|--------|
| `GET` | `/api/stats` | آمار داشبورد |
| `GET` `POST` | `/api/accounts` | لیست / افزودن اکانت |
| `GET` `PUT` `DELETE` | `/api/accounts/:id` | جزئیات / ویرایش / حذف |
| `POST` | `/api/accounts/verify` | اعتبارسنجی توکن |
| `GET` `POST` | `/api/nodes` | لیست / افزودن نود |
| `GET` `POST` | `/api/sublinks` | لیست / افزودن لینک ساب |

## تکنولوژی‌ها

Next.js 15 &bull; TypeScript &bull; Tailwind CSS v4 &bull; Prisma + SQLite &bull; TanStack Query &bull; Zod

## مشارکت

از Pull Request استقبال می‌کنیم. Fork کنید، برنچ بسازید، تغییرات را Push کنید.

## لایسنس

[MIT](LICENSE)

---

<div align="center">

با الهام از [Zeus Panel](https://github.com/IR-NETLIFY/zeus) — ساخته شده توسط [NikVPN](https://github.com/nikvpn-iran)

</div>
