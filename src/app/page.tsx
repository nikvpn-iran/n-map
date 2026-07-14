"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { StatCard } from "@/components/StatCard";
import { Modal } from "@/components/Modal";
import { AddAccountForm } from "@/components/AddAccountForm";
import { AddNodeForm } from "@/components/AddNodeForm";
import { AddSubLinkForm } from "@/components/AddSubLinkForm";
import { AccountsTable } from "@/components/AccountsTable";
import { NodesTable } from "@/components/NodesTable";
import { SubLinksTable } from "@/components/SubLinksTable";
import { useStats } from "@/hooks/useApi";
import { Users, Server, Link, Plus } from "lucide-react";

type ModalType = "account" | "node" | "sublink" | null;

export default function Home() {
  const { data: stats, isLoading } = useStats();
  const [modal, setModal] = useState<ModalType>(null);
  const [tab, setTab] = useState<"accounts" | "nodes" | "sublinks">("accounts");

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="اکانت‌های متصل"
            value={stats?.accounts ?? 0}
            icon={Users}
            color="purple"
            loading={isLoading}
          />
          <StatCard
            title="نودهای فعال"
            value={stats?.activeNodes ?? 0}
            icon={Server}
            color="emerald"
            loading={isLoading}
          />
          <StatCard
            title="لینک‌های ساب"
            value={stats?.subLinks ?? 0}
            icon={Link}
            color="amber"
            loading={isLoading}
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setModal("account")}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            افزودن اکانت API
          </button>
          <button
            onClick={() => setModal("node")}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            افزودن نود
          </button>
          <button
            onClick={() => setModal("sublink")}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700"
          >
            <Plus className="h-4 w-4" />
            افزودن لینک ساب
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex gap-1 rounded-xl bg-gray-900 p-1">
          {([
            { key: "accounts", label: "اکانت‌ها", icon: Users },
            { key: "nodes", label: "نودها", icon: Server },
            { key: "sublinks", label: "لینک‌های ساب", icon: Link },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === t.key
                  ? "bg-gray-800 text-white shadow"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <t.icon className="h-4 w-4" />
                {t.label}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {tab === "accounts" && <AccountsTable />}
          {tab === "nodes" && <NodesTable />}
          {tab === "sublinks" && <SubLinksTable />}
        </div>
      </main>

      {/* Modals */}
      <Modal open={modal === "account"} onClose={() => setModal(null)} title="افزودن اکانت API جدید">
        <AddAccountForm onSuccess={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "node"} onClose={() => setModal(null)} title="افزودن نود جدید">
        <AddNodeForm onSuccess={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "sublink"} onClose={() => setModal(null)} title="افزودن لینک ساب جدید">
        <AddSubLinkForm onSuccess={() => setModal(null)} />
      </Modal>
    </>
  );
}
