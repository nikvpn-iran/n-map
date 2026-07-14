import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAccountSchema } from "@/lib/validations";

export async function GET() {
  const accounts = await prisma.account.findMany({
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { nodes: true, subLinks: true } },
    },
  });
  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createAccountSchema.parse(body);

    // اگر هیچ اکانتی نیست، اولین اکانت primary شود
    const existingCount = await prisma.account.count();
    const shouldBePrimary = existingCount === 0;

    const account = await prisma.account.create({
      data: {
        name: data.name,
        platform: data.platform,
        token: data.token,
        email: data.email || null,
        isActive: data.isActive,
        isPrimary: shouldBePrimary,
        accountExternalId: data.accountExternalId || null,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "issues" in err) {
      return NextResponse.json(
        { error: "اطلاعات نامعتبر", details: err },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
