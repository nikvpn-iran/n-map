import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "N-MAP | پنل مدیریت چند API",
  description: "N-MAP — nikvpn multi api panel — مدیریت متمرکز اکانت‌ها، نودها و لینک‌های ساب",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
