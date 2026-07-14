"use client";

import Image from "next/image";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.jpg"
            alt="NikVPN Logo"
            width={44}
            height={44}
            className="rounded-lg"
          />
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-white">
              N-MAP
            </h1>
            <p className="text-[11px] text-gray-400">پنل مدیریت چند API</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="hidden sm:inline">nikvpn multi api panel</span>
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_theme(colors.emerald.400)]" />
        </div>
      </div>
    </header>
  );
}
