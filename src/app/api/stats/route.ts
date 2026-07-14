import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [accounts, activeNodes, subLinks] = await Promise.all([
    prisma.account.count(),
    prisma.node.count({ where: { healthStatus: { not: "unhealthy" } } }),
    prisma.subLink.count(),
  ]);

  return NextResponse.json({ accounts, activeNodes, subLinks });
}
