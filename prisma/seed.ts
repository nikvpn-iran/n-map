import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // پاک‌سازی داده‌های قبلی (ترتیب به خاطر روابط)
  await prisma.node.deleteMany();
  await prisma.subLink.deleteMany();
  await prisma.account.deleteMany();

  const cf1 = await prisma.account.create({
    data: {
      name: "کلودفلر اصلی",
      platform: "cloudflare",
      token: "cf-token-sample-0001",
      email: "main@nikvpn.example",
      isActive: true,
    },
  });

  const cf2 = await prisma.account.create({
    data: {
      name: "کلودفلر پشتیبان",
      platform: "cloudflare",
      token: "cf-token-sample-0002",
      isActive: true,
    },
  });

  const vc1 = await prisma.account.create({
    data: {
      name: "ورسل تیم",
      platform: "vercel",
      token: "vc-token-sample-0001",
      isActive: true,
    },
  });

  await prisma.node.createMany({
    data: [
      { name: "نود آلمان ۱", ip: "49.12.10.20", port: 443, type: "vless", healthStatus: "healthy", accountId: cf1.id },
      { name: "نود فنلاند", ip: "95.216.1.2", port: 8443, type: "trojan", healthStatus: "healthy", accountId: cf1.id },
      { name: "نود هلند", ip: "51.75.20.30", port: 443, type: "vmess", healthStatus: "unhealthy", accountId: cf2.id },
      { name: "نود آمریکا", ip: "76.76.21.21", port: 443, type: "vless", healthStatus: "healthy", accountId: vc1.id },
    ],
  });

  const GB = 1024n * 1024n * 1024n;
  await prisma.subLink.createMany({
    data: [
      {
        name: "ساب کاربران طلایی",
        url: "https://sub.nikvpn.example/gold",
        trafficLimit: 100n * GB,
        trafficUsed: 42n * GB,
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        accountId: cf1.id,
      },
      {
        name: "ساب تست",
        url: "https://sub.nikvpn.example/trial",
        trafficLimit: 10n * GB,
        trafficUsed: 3n * GB,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        accountId: vc1.id,
      },
    ],
  });

  console.log("✅ Seed انجام شد.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
