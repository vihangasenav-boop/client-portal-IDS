import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // Get client token
    const token = req.cookies.get("client-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify JWT
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // Make sure this is a client
    if (decoded.role !== "CLIENT" && decoded.role !== "PROPERTY_ADMIN") {
      return NextResponse.json(
        { error: "Invalid client session" },
        { status: 403 }
      );
    }

    const userId = Number(decoded.id);

    if (!Number.isInteger(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 401 }
      );
    }

    // Get client + property
    const user = await prisma.propertyUsers.findUnique({
      where: {
        id: userId,
      },
      include: {
        property: {
          include: {
            propertyModules: {
              include: {
                module: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    isActive: true,
                    sortOrder: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get active modules
    const allowedModules = user.property.propertyModules
      .filter((item) => item.module.isActive)
      .sort((a, b) => a.module.sortOrder - b.module.sortOrder)
      .map((item) => item.module.code);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        propertyId: user.propertyId,
        allowedModules,
      },

      property: {
        id: user.property.id,
        code: user.property.code,
        name: user.property.name,
        address: user.property.address,
      },

      // These are not currently stored in your database
      accountingDate: "",
      accessMode:
        user.role === "PROPERTY_ADMIN"
          ? "PROPERTY ADMIN"
          : "CLIENT",
    });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);

    return NextResponse.json(
      {
        error: "Unable to load authenticated user",
      },
      { status: 500 }
    );
  }
}