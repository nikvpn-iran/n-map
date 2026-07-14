import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNodeSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("accountId");
  const nodes = await prisma.node.findMany({
    where: accountId ? { accountId } : undefined,
    orderBy: { createdAt: "desc" },
    include: { account: { select: { name: true, platform: true } } },
  });
  return NextResponse.json(nodes);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createNodeSchema.parse(body);
    const node = await prisma.node.create({
      data: {
        name: data.name,
        ip: data.ip,
        port: data.port,
        type: data.type,
        configLink: data.configLink || null,
        accountId: data.accountId,
      },
    });
    return NextResponse.json(node, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "issues" in err) {
      return NextResponse.json({ error: "اطلاعات نامعتبر", details: err }, { status: 400 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
