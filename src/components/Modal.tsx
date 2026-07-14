"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={cn(
        "w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 p-0 text-white shadow-2xl backdrop:bg-black/60",
        "open:animate-in open:fade-in-0 open:zoom-in-95"
      )}
    >
      <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <h2 className="text-base font-bold">{title}</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="px-6 py-5" dir="rtl">{children}</div>
    </dialog>
  );
}
