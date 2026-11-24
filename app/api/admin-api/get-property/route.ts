
// =============================================
// GET ALL PROPERTIES
// =============================================

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // ==========================================
    // GET SINGLE PROPERTY
    // ==========================================
    if (id) {
      const property = await prisma.property.findUnique({
        where: {
          id: Number(id),
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
            },
          },

          propertyModules: {
            include: {
              module: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      });

      if (!property) {
        return NextResponse.json(
          {
            error: "Property not found",
          },
          {
            status: 404,
          }
        );
      }

      return NextResponse.json({
        property: {
          ...property,

          // Convert Prisma relation into the format
          // your frontend expects.
          modules: property.propertyModules.map(
            (item) => item.module.code
          ),
        },
      });
    }

    // ==========================================
    // GET ALL PROPERTIES
    // ==========================================

    const properties = await prisma.property.findMany({
      orderBy: {
        createdAt: "desc",
      },

      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },

        propertyModules: {
          include: {
            module: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      properties,
    });
  } catch (error) {
    console.error("Failed to load properties:", error);

    return NextResponse.json(
      {
        error: "Unable to load properties",
      },
      {
        status: 500,
      }
    );
  }
}