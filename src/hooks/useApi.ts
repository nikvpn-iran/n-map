"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateAccountInput, CreateNodeInput, CreateSubLinkInput } from "@/lib/validations";

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("خطا در دریافت اطلاعات");
  return res.json();
}

export interface Stats {
  accounts: number;
  activeNodes: number;
  subLinks: number;
}

export interface Account {
  id: string;
  name: string;
  platform: string;
  token: string;
  email: string | null;
  isActive: boolean;
  isPrimary: boolean;
  accountExternalId: string | null;
  createdAt: string;
  _count?: { nodes: number; subLinks: number };
}

export interface VerifyResult {
  valid: boolean;
  accountExternalId?: string;
  accountName?: string;
  error?: string;
}

export interface NodeItem {
  id: string;
  name: string;
  ip: string;
  port: number;
  type: string;
  healthStatus: string;
  configLink: string | null;
  createdAt: string;
  accountId: string;
  account?: { name: string; platform: string };
}

export interface SubLinkItem {
  id: string;
  name: string;
  url: string;
  trafficLimit: string;
  trafficUsed: string;
  expiresAt: string | null;
  createdAt: string;
  accountId: string;
  account?: { name: string; platform: string };
}

export function useStats() {
  return useQuery<Stats>({ queryKey: ["stats"], queryFn: () => fetcher("/api/stats") });
}

export function useAccounts() {
  return useQuery<Account[]>({ queryKey: ["accounts"], queryFn: () => fetcher("/api/accounts") });
}

export function useNodes() {
  return useQuery<NodeItem[]>({ queryKey: ["nodes"], queryFn: () => fetcher("/api/nodes") });
}

export function useSubLinks() {
  return useQuery<SubLinkItem[]>({ queryKey: ["sublinks"], queryFn: () => fetcher("/api/sublinks") });
}

export function useVerifyToken() {
  return useMutation<VerifyResult, Error, { token: string; platform: string }>({
    mutationFn: async ({ token, platform }) => {
      const res = await fetch("/api/accounts/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, platform }),
      });
      return res.json();
    },
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAccountInput) => {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "خطا");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("خطا در حذف");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["nodes"] });
      qc.invalidateQueries({ queryKey: ["sublinks"] });
    },
  });
}

export function useSetPrimary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: true }),
      });
      if (!res.ok) throw new Error("خطا");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useCreateNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateNodeInput) => {
      const res = await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "خطا");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nodes"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useCreateSubLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSubLinkInput) => {
      const res = await fetch("/api/sublinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "خطا");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sublinks"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
