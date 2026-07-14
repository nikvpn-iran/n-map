import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSubLinkSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("accountId");
  const subLinks = await prisma.subLink.findMany({
    where: accountId ? { accountId } : undefined,
    orderBy: { createdAt: "desc" },
    include: { account: { select: { name: true, platform: true } } },
  });

  const serialized = subLinks.map((s) => ({
    ...s,
    trafficLimit: s.trafficLimit.toString(),
    trafficUsed: s.trafficUsed.toString(),
  }));

  return NextResponse.json(serialized);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createSubLinkSchema.parse(body);
    const subLink = await prisma.subLink.create({
      data: {
        name: data.name,
        url: data.url,
        trafficLimit: BigInt(data.trafficLimit),
        trafficUsed: BigInt(data.trafficUsed),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        accountId: data.accountId,
      },
    });

    return NextResponse.json(
      { ...subLink, trafficLimit: subLink.trafficLimit.toString(), trafficUsed: subLink.trafficUsed.toString() },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err && typeof err === "object" && "issues" in err) {
      return NextResponse.json({ error: "اطلاعات نامعتبر", details: err }, { status: 400 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
