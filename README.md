<div align="center">

<img src="logo.jpg" alt="NikVPN Logo" width="120" />

# N-MAP

### nikvpn multi api panel

پنل مدیریت متمرکز برای هندل کردن همزمان چندین اکانت API از پلتفرم‌های مختلف (Cloudflare، Vercel و ...)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)

</div>

---

## ویژگی‌ها

- **مدیریت چند اکانت API** — اتصال همزمان نامحدود توکن از پلتفرم‌های مختلف (مثلاً ۳ Cloudflare + ۲ Vercel)
- **مدیریت نودهای پروکسی** — ثبت و مانیتور نودها با آی‌پی، پورت، نوع (VLESS/VMess/Trojan/Shadowsocks) و وضعیت سلامت
- **مدیریت لینک‌های ساب** — ساب‌اسکریپشن‌ها با کنترل ترافیک و تاریخ انقضا
- **داشبورد لحظه‌ای** — آمار زنده بدون نیاز به رفرش صفحه
- **رابط کاربری فارسی (RTL)** — طراحی کاملاً راست‌به‌چپ با فونت وزیرمتن
- **ریسپانسیو** — سازگار با موبایل، تبلت و دسکتاپ
- **دارک مود** — تم تیره حرفه‌ای

## تکنولوژی‌ها

| لایه | تکنولوژی |
|------|----------|
| فریمورک | Next.js 15 (App Router) |
| زبان | TypeScript 5 |
| استایل | Tailwind CSS v4 |
| دیتابیس | SQLite + Prisma ORM |
| مدیریت State | TanStack React Query |
| اعتبارسنجی | Zod |
| آیکون‌ها | Lucide React |

## پیش‌نیازها

- [Node.js](https://nodejs.org) نسخه **18** یا بالاتر
- [npm](https://npmjs.com) نسخه **9** یا بالاتر

## نصب و راه‌اندازی

**۱. کلون کردن ریپازیتوری:**

```bash
git clone https://github.com/nikvpn-iran/n-map.git
cd n-map
```

**۲. نصب پکیج‌ها:**

```bash
npm install
```

**۳. ساخت دیتابیس و اجرای مایگریشن:**

```bash
npx prisma migrate dev
```

> این دستور دیتابیس SQLite را می‌سازد و داده‌های نمونه (Seed) را وارد می‌کند.

**۴. اجرای سرور توسعه:**

```bash
npm run dev
```

**۵. باز کردن پنل:**

مرورگر را باز کنید و به آدرس زیر بروید:

```
http://localhost:3000
```

## ساختار پروژه

```
n-map/
├── prisma/
│   ├── schema.prisma        # مدل‌های دیتابیس
│   ├── seed.ts               # داده‌های نمونه اولیه
│   └── migrations/           # فایل‌های مایگریشن
├── public/
│   └── logo.jpg              # لوگوی NikVPN
├── src/
│   ├── app/
│   │   ├── layout.tsx        # لایوت اصلی (RTL + فونت فارسی)
│   │   ├── page.tsx          # صفحه داشبورد
│   │   ├── globals.css       # استایل‌های سراسری + تم رنگی
│   │   └── api/
│   │       ├── accounts/     # CRUD اکانت‌ها
│   │       ├── nodes/        # CRUD نودها
│   │       ├── sublinks/     # CRUD لینک‌های ساب
│   │       └── stats/        # آمار داشبورد
│   ├── components/
│   │   ├── Header.tsx        # هدر با لوگو و برندینگ
│   │   ├── StatCard.tsx      # کارت‌های آماری
│   │   ├── Modal.tsx         # مودال عمومی
│   │   ├── AddAccountForm.tsx
│   │   ├── AddNodeForm.tsx
│   │   ├── AddSubLinkForm.tsx
│   │   ├── AccountsTable.tsx
│   │   ├── NodesTable.tsx
│   │   ├── SubLinksTable.tsx
│   │   └── Providers.tsx     # React Query Provider
│   ├── hooks/
│   │   └── useApi.ts         # هوک‌های API (React Query)
│   └── lib/
│       ├── prisma.ts         # اتصال Prisma
│       ├── utils.ts          # توابع کمکی
│       └── validations.ts    # اسکیماهای Zod
├── package.json
├── tsconfig.json
├── next.config.ts
└── postcss.config.mjs
```

## مدل‌های داده

### Account (اکانت API)
| فیلد | نوع | توضیح |
|------|-----|-------|
| name | String | نام اکانت |
| platform | String | پلتفرم (`cloudflare` / `vercel`) |
| token | String | توکن دسترسی API |
| email | String? | ایمیل (اختیاری — برای Cloudflare Global Key) |
| isActive | Boolean | فعال/غیرفعال |

### Node (نود پروکسی)
| فیلد | نوع | توضیح |
|------|-----|-------|
| name | String | نام نود |
| ip | String | آدرس IP |
| port | Int | شماره پورت |
| type | String | نوع (`vless` / `vmess` / `trojan` / `shadowsocks`) |
| healthStatus | String | وضعیت سلامت (`healthy` / `unhealthy` / `unknown`) |
| configLink | String? | لینک کانفیگ |
| accountId | String | اکانت مرتبط |

### SubLink (لینک ساب)
| فیلد | نوع | توضیح |
|------|-----|-------|
| name | String | نام لینک |
| url | String | آدرس URL ساب‌اسکریپشن |
| trafficLimit | BigInt | سقف ترافیک (بایت) |
| trafficUsed | BigInt | ترافیک مصرف‌شده (بایت) |
| expiresAt | DateTime? | تاریخ انقضا |
| accountId | String | اکانت مرتبط |

## API Endpoints

| متد | مسیر | عملکرد |
|-----|------|--------|
| `GET` | `/api/stats` | آمار کلی داشبورد |
| `GET` | `/api/accounts` | لیست تمام اکانت‌ها |
| `POST` | `/api/accounts` | افزودن اکانت جدید |
| `GET` | `/api/accounts/:id` | جزئیات یک اکانت |
| `PUT` | `/api/accounts/:id` | ویرایش اکانت |
| `DELETE` | `/api/accounts/:id` | حذف اکانت |
| `GET` | `/api/nodes` | لیست نودها |
| `POST` | `/api/nodes` | افزودن نود |
| `GET` | `/api/sublinks` | لیست لینک‌های ساب |
| `POST` | `/api/sublinks` | افزودن لینک ساب |

## دستورات مفید

```bash
# اجرای سرور توسعه
npm run dev

# بیلد پروداکشن
npm run build

# اجرای سرور پروداکشن
npm start

# ساخت مایگریشن جدید
npm run db:migrate

# ری‌ست و seed دیتابیس
npm run db:seed
```

## مشارکت

از Pull Request و Issue استقبال می‌کنیم! برای مشارکت:

1. ریپازیتوری را Fork کنید
2. برنچ جدید بسازید (`git checkout -b feature/amazing-feature`)
3. تغییرات خود را Commit کنید
4. به برنچ Push کنید (`git push origin feature/amazing-feature`)
5. یک Pull Request باز کنید

## لایسنس

این پروژه تحت لایسنس [MIT](LICENSE) منتشر شده است.

## تقدیر

این پروژه با الهام از [Zeus Panel](https://github.com/IR-NETLIFY/zeus) توسعه یافته و به عنوان نسخه ارتقایافته و مدرن آن طراحی شده است.

---

<div align="center">

ساخته شده با عشق توسط تیم [NikVPN](https://github.com/nikvpn-iran)

</div>
