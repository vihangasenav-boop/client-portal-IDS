import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb({
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "12345",
  database: "portal-new",
  connectionLimit: 5,
  allowPublicKeyRetrieval: true,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Testing Prisma -> MySQL...");

  await prisma.$queryRaw`SELECT 1`;

  console.log("✅ Prisma database connection works");
  console.log("Connection check passed");
}

main()
  .catch((error) => {
    console.error("❌ Prisma connection failed:");
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });