import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

// -----------------------------------------
// Get authenticated FOM PropertyModule
// -----------------------------------------

async function getFomPropertyModule(
  req: NextRequest
) {
  const token =
    req.cookies.get("client-token")?.value;

  if (!token) {
    throw new Error("Not authenticated");
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    throw new Error(
      "Invalid or expired session"
    );
  }

  if (
    decoded.role !== "CLIENT" &&
    decoded.role !== "PROPERTY_ADMIN"
  ) {
    throw new Error(
      "Invalid client session"
    );
  }

  const userId = Number(decoded.id);

  if (!Number.isInteger(userId)) {
    throw new Error("Invalid user ID");
  }

  const user =
    await prisma.propertyUsers.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
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
        propertyId: true,
        moduleId: true,
      },
    });

  if (!propertyModule) {
    throw new Error(
      "Property module not found"
    );
  }

  return {
    user,
    propertyModule,
  };
}

// -----------------------------------------
// GET
// -----------------------------------------

export async function GET(
  req: NextRequest
) {
  try {
    const { propertyModule } =
      await getFomPropertyModule(req);

    const roomFloors =
      await prisma.roomFloor.findMany({
        where: {
          propertyModuleId:
            propertyModule.id,
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
      propertyModuleId:
        propertyModule.id,
      roomFloors,
    });
  } catch (error) {
    console.error(
      "GET ROOM FLOORS ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load room floors";

    let status = 500;

    if (
      message === "Not authenticated" ||
      message ===
        "Invalid or expired session"
    ) {
      status = 401;
    }

    if (
      message === "Invalid client session"
    ) {
      status = 403;
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}

// -----------------------------------------
// POST
// -----------------------------------------

export async function POST(
  req: NextRequest
) {
  try {
    const { propertyModule } =
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
        { success: false, error: "Each room floor row must be an object." },
        { status: 400 }
      );
    }

    const rows = (inputRows as Record<string, unknown>[]).map(
      (row, index) => ({
        id:
          Number.isInteger(Number(row.id)) && Number(row.id) > 0
            ? Number(row.id)
            : null,
        floorCode: String(row.floorCode ?? "").trim(),
        floorName: String(row.floorName ?? "").trim(),
        isDefault: row.isDefault === true || row.isDefault === "Yes",
        sortOrder: index,
      })
    );

    const codeSet = new Set<string>();
    const nameSet = new Set<string>();
    for (const row of rows) {
      if (!row.floorCode || !row.floorName) {
        return NextResponse.json(
          { success: false, error: "Floor code and name are required." },
          { status: 400 }
        );
      }

      const code = row.floorCode.toLowerCase();
      const name = row.floorName.toLowerCase();
      if (codeSet.has(code) || nameSet.has(name)) {
        return NextResponse.json(
          { success: false, error: "Room floor codes and names must be unique." },
          { status: 409 }
        );
      }
      codeSet.add(code);
      nameSet.add(name);
    }

    if (rows.filter((row) => row.isDefault).length > 1) {
      return NextResponse.json(
        { success: false, error: "Only one Room Floor can be default." },
        { status: 400 }
      );
    }

    const existingRows = await prisma.roomFloor.findMany({
      where: { propertyModuleId: propertyModule.id },
      select: { id: true, floorCode: true },
    });
    const existingIds = new Set(existingRows.map((row) => row.id));
    const incomingIds = new Set(
      rows.flatMap((row) => (row.id ? [row.id] : []))
    );

    if (rows.some((row) => row.id && !existingIds.has(row.id))) {
      return NextResponse.json(
        { success: false, error: "A room floor row does not belong to this property." },
        { status: 404 }
      );
    }

    for (const row of rows) {
      const duplicate = existingRows.find(
        (existing) =>
          existing.floorCode.toLowerCase() === row.floorCode.toLowerCase() &&
          existing.id !== row.id &&
          !incomingIds.has(existing.id)
      );
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: `Floor code "${row.floorCode}" already exists.` },
          { status: 409 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const data = {
          floorCode: row.floorCode,
          floorName: row.floorName,
          isDefault: row.isDefault,
          isActive: true,
          sortOrder: row.sortOrder,
        };

        if (row.id && existingIds.has(row.id)) {
          await tx.roomFloor.update({ where: { id: row.id }, data });
        } else {
          await tx.roomFloor.create({
            data: { ...data, propertyModuleId: propertyModule.id },
          });
        }
      }
    });

    const roomFloors = await prisma.roomFloor.findMany({
      where: { propertyModuleId: propertyModule.id, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Room floors saved successfully",
        propertyModuleId:
          propertyModule.id,
        roomFloors,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE ROOM FLOORS ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to save room floors";

    let status = 500;

    if (
      message === "Not authenticated" ||
      message ===
        "Invalid or expired session"
    ) {
      status = 401;
    }

    if (
      message === "Invalid client session"
    ) {
      status = 403;
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { propertyModule } = await getFomPropertyModule(req);

    if (req.nextUrl.searchParams.get("all") === "true") {
      const result = await prisma.roomFloor.deleteMany({
        where: { propertyModuleId: propertyModule.id },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid room floor row." },
        { status: 400 }
      );
    }

    const result = await prisma.roomFloor.deleteMany({
      where: { id, propertyModuleId: propertyModule.id },
    });
    if (result.count === 0) {
      return NextResponse.json(
        { success: false, error: "Room floor not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE ROOM FLOOR ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to delete room floor.";
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