import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const adapter = new PrismaMariaDb({
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "12345",
  database: "portal-new",
  connectionLimit: 10,
  allowPublicKeyRetrieval: true,
});

const prisma = new PrismaClient({
  adapter,
});

const modules = [
  {
    code: "FOM",
    name: "FX Front Office",
    description: "Front Office",
    sortOrder: 1,
  },
  {
    code: "POS",
    name: "FX POS",
    description: "Point of Sale",
    sortOrder: 2,
  },
  {
    code: "FAS",
    name: "FX Finance",
    description: "Finance",
    sortOrder: 3,
  },
  {
    code: "MMS",
    name: "FX MMS",
    description: "Material Management System",
    sortOrder: 4,
  },
];

async function main() {
  for (const module of modules) {
    await prisma.module.upsert({
      where: { code: module.code },
      update: {},
      create: module,
    });
  }

  const adminPassword = await bcrypt.hash("admin123", 12);

  await prisma.user.upsert({
    where: {
      email: "admin@fx1.com",
    },
    update: {},
    create: {
  id: randomUUID(),
  name: "Admin User",
  email: "admin@fx1.com",
  password: adminPassword,
  role: "admin",
  allowedModules: "",
},
  });

  console.log("✅ Module catalog seeded");
  console.log("✅ Admin user seeded");
  console.log("Email: admin@fx1.com");
  console.log("Password: admin123");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });