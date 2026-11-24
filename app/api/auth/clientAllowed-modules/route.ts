import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // 1. Get client JWT
    const token = req.cookies.get("client-token")?.value;

    console.log("Client token exists:", !!token);

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // 2. Verify JWT
    const decoded = verifyToken(token);

    console.log("Decoded client token:", decoded);

    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // 3. Get PropertyUsers ID
    const userId = Number(decoded.id);

    console.log("Client user ID:", userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 401 }
      );
    }

    // 4. Get client user + property + modules
    const user = await prisma.propertyUsers.findUnique({
      where: {
        id: userId,
      },

      include: {
        property: {
          include: {
            propertyModules: {
              where: {
                module: {
                  isActive: true,
                },
              },

              include: {
                module: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    description: true,
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
        {
          error: "Client user not found",
        },
        { status: 404 }
      );
    }

    // 5. Convert modules
    const modules = user.property.propertyModules
      .sort(
        (a, b) =>
          a.module.sortOrder - b.module.sortOrder
      )
      .map((propertyModule) => ({
        id: propertyModule.module.id,
        code: propertyModule.module.code,
        name: propertyModule.module.name,
        description: propertyModule.module.description,
      }));

    // 6. Return data
    return NextResponse.json({
      property: {
        id: user.property.id,
        code: user.property.code,
        name: user.property.name,
        address: user.property.address,
      },

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },

      modules,
    });
  } catch (error) {
    console.error(
      "Client modules API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to load client modules",
      },
      { status: 500 }
    );
  }
}