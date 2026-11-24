import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const modules = await prisma.module.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    return NextResponse.json({ modules });
  } catch (error) {
    console.error("Failed to load modules:", error);

    return NextResponse.json(
      { error: "Unable to load modules" },
      { status: 500 }
    );
  }
}