import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

async function getFomPropertyModule(req: NextRequest) {
  const token = req.cookies.get("client-token")?.value;

  if (!token) {
    throw new Error("Not authenticated");
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    throw new Error("Invalid or expired session");
  }

  if (
    decoded.role !== "CLIENT" &&
    decoded.role !== "PROPERTY_ADMIN"
  ) {
    throw new Error("Invalid client session");
  }

  const userId = Number(decoded.id);

  if (!Number.isInteger(userId)) {
    throw new Error("Invalid user ID");
  }

  const user = await prisma.propertyUsers.findUnique({
    where: {
      id: userId,
    },
    select: {
      propertyId: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const propertyModule =
    await prisma.propertyModule.findFirst({
      where: {
        propertyId: user.propertyId,
        module: {
          code: "FOM",
          isActive: true,
        },
      },
      select: {
        id: true,
      },
    });

  if (!propertyModule) {
    throw new Error("Property module not found");
  }

  return propertyModule;
}

// ==========================================
// GET ROOM AMENITIES
// ==========================================

export async function GET(req: NextRequest) {
  try {
    const propertyModule =
      await getFomPropertyModule(req);

    const roomAmenities =
      await prisma.roomAmenity.findMany({
        where: {
          propertyModuleId: propertyModule.id,
          isActive: true,
        },
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            id: "asc",
          },
        ],
      });

    return NextResponse.json({
      success: true,
      roomAmenities,
    });
  } catch (error) {
    console.error(
      "GET ROOM AMENITIES ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load room amenities";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status:
          message === "Not authenticated" ||
          message === "Invalid or expired session"
            ? 401
            : message === "Invalid client session"
              ? 403
              : 500,
      }
    );
  }
}

// ==========================================
// POST ROOM AMENITIES
// ==========================================

export async function POST(req: NextRequest) {
  try {
    const propertyModule =
      await getFomPropertyModule(req);

    const body = await req.json();

    if (!Array.isArray(body?.rows)) {
      return NextResponse.json(
        { success: false, error: "Rows must be an array." },
        { status: 400 }
      );
    }

    const inputRows = body.rows as unknown[];
    if (inputRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one row is required." },
        { status: 400 }
      );
    }

    if (
      inputRows.some(
        (row) => row === null || typeof row !== "object" || Array.isArray(row)
      )
    ) {
      return NextResponse.json(
        { success: false, error: "Each room amenity row must be an object." },
        { status: 400 }
      );
    }

    const rows = (inputRows as Record<string, unknown>[]).map(
      (row, index) => ({
        id:
          Number.isInteger(Number(row.id)) && Number(row.id) > 0
            ? Number(row.id)
            : null,
        code: String(row.code ?? "").trim(),
        name: String(row.name ?? "").trim(),
        isDefault: row.isDefault === true || row.isDefault === "Yes",
        sortOrder: index,
      })
    );

    const codeSet = new Set<string>();
    const nameSet = new Set<string>();
    for (const row of rows) {
      if (!row.code || !row.name) {
        return NextResponse.json(
          { success: false, error: "Room amenity code and name are required." },
          { status: 400 }
        );
      }

      const code = row.code.toLowerCase();
      const name = row.name.toLowerCase();
      if (codeSet.has(code) || nameSet.has(name)) {
        return NextResponse.json(
          { success: false, error: "Room amenity codes and names must be unique." },
          { status: 409 }
        );
      }
      codeSet.add(code);
      nameSet.add(name);
    }

    if (rows.filter((row) => row.isDefault).length > 1) {
      return NextResponse.json(
        { success: false, error: "Only one Room Amenity can be default." },
        { status: 400 }
      );
    }

    const existingRows = await prisma.roomAmenity.findMany({
      where: { propertyModuleId: propertyModule.id },
      select: { id: true, code: true },
    });
    const existingIds = new Set(existingRows.map((row) => row.id));
    const incomingIds = new Set(
      rows.flatMap((row) => (row.id ? [row.id] : []))
    );

    if (rows.some((row) => row.id && !existingIds.has(row.id))) {
      return NextResponse.json(
        { success: false, error: "A room amenity row does not belong to this property." },
        { status: 404 }
      );
    }

    for (const row of rows) {
      const duplicate = existingRows.find(
        (existing) =>
          existing.code.toLowerCase() === row.code.toLowerCase() &&
          existing.id !== row.id &&
          !incomingIds.has(existing.id)
      );
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: `Room amenity code "${row.code}" already exists.` },
          { status: 409 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const data = {
          code: row.code,
          name: row.name,
          isDefault: row.isDefault,
          isActive: true,
          sortOrder: row.sortOrder,
        };

        if (row.id && existingIds.has(row.id)) {
          await tx.roomAmenity.update({ where: { id: row.id }, data });
        } else {
          await tx.roomAmenity.create({
            data: { ...data, propertyModuleId: propertyModule.id },
          });
        }
      }
    });

    const roomAmenities = await prisma.roomAmenity.findMany({
      where: { propertyModuleId: propertyModule.id, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Room amenities saved successfully",
        roomAmenities,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE ROOM AMENITIES ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to save room amenities";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const propertyModule = await getFomPropertyModule(req);

    if (req.nextUrl.searchParams.get("all") === "true") {
      const result = await prisma.roomAmenity.deleteMany({
        where: { propertyModuleId: propertyModule.id },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid room amenity row." },
        { status: 400 }
      );
    }

    const result = await prisma.roomAmenity.deleteMany({
      where: { id, propertyModuleId: propertyModule.id },
    });
    if (result.count === 0) {
      return NextResponse.json(
        { success: false, error: "Room amenity not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE ROOM AMENITY ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to delete room amenity.";
    const status =
      message === "Not authenticated" ||
      message === "Invalid or expired session"
        ? 401
        : message === "Invalid client session"
          ? 403
          : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}