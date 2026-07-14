import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateAccountSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const account = await prisma.account.findUnique({
    where: { id },
    include: { nodes: true, subLinks: true },
  });
  if (!account) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  return NextResponse.json(account);
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateAccountSchema.parse(body);

    // اگر isPrimary = true ارسال شده، بقیه را false کن
    if (data.isPrimary === true) {
      await prisma.account.updateMany({
        where: { isPrimary: true, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    const account = await prisma.account.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.platform !== undefined && { platform: data.platform }),
        ...(data.token !== undefined && { token: data.token }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
      },
    });
    return NextResponse.json(account);
  } catch {
    return NextResponse.json({ error: "خطا در بروزرسانی" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
