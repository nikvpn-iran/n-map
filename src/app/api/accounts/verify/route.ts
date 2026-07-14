import { NextRequest, NextResponse } from "next/server";

interface VerifyResult {
  valid: boolean;
  accountExternalId?: string;
  accountName?: string;
  error?: string;
}

async function verifyCloudflare(token: string): Promise<VerifyResult> {
  const verifyRes = await fetch(
    "https://api.cloudflare.com/client/v4/user/tokens/verify",
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!verifyRes.ok || !(await verifyRes.json()).success) {
    return { valid: false, error: "توکن کلودفلر نامعتبر است" };
  }

  const accountsRes = await fetch(
    "https://api.cloudflare.com/client/v4/accounts",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const accountsData = await accountsRes.json();

  if (!accountsData.success || !accountsData.result?.length) {
    return { valid: false, error: "اکانت کلودفلر یافت نشد" };
  }

  const acc = accountsData.result[0];
  return {
    valid: true,
    accountExternalId: acc.id,
    accountName: acc.name,
  };
}

async function verifyVercel(token: string): Promise<VerifyResult> {
  const res = await fetch("https://api.vercel.com/v2/user", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    return { valid: false, error: "توکن ورسل نامعتبر است" };
  }

  const data = await res.json();
  return {
    valid: true,
    accountExternalId: data.user?.id || data.id,
    accountName: data.user?.username || data.username || data.name,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { token, platform } = await req.json();

    if (!token || !platform) {
      return NextResponse.json(
        { valid: false, error: "توکن و پلتفرم الزامی است" },
        { status: 400 }
      );
    }

    let result: VerifyResult;

    if (platform === "cloudflare") {
      result = await verifyCloudflare(token);
    } else if (platform === "vercel") {
      result = await verifyVercel(token);
    } else {
      result = { valid: false, error: "پلتفرم پشتیبانی نمی‌شود" };
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { valid: false, error: "خطا در ارتباط با سرور پلتفرم" },
      { status: 500 }
    );
  }
}
