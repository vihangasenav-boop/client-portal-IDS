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

  const user = await prisma.propertyUsers.findUnique({
    where: { id: userId },
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

/* =========================================
   GET
========================================= */

export async function GET(req: NextRequest) {
  try {
    const propertyModule =
      await getFomPropertyModule(req);

    const [
      roomTypes,
      roomFeatures,
      roomAmenities,
    ] = await Promise.all([
      prisma.roomType.findMany({
        where: {
          propertyModuleId: propertyModule.id,
        },
        include: {
          roomTypeFeatures: {
            select: {
              roomFeatureId: true,
            },
          },
          roomTypeAmenities: {
            select: {
              roomAmenityId: true,
            },
          },
        },
        orderBy: {
          displaySequence: "asc",
        },
      }),

      prisma.roomFeature.findMany({
        where: {
          propertyModuleId: propertyModule.id,
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      }),

      prisma.roomAmenity.findMany({
        where: {
          propertyModuleId: propertyModule.id,
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,

      roomTypes: roomTypes.map((roomType) => ({
        ...roomType,
        overBooking: Number(roomType.overBooking),

        roomFeatureIds:
          roomType.roomTypeFeatures.map(
            (item) => item.roomFeatureId
          ),

        roomAmenityIds:
          roomType.roomTypeAmenities.map(
            (item) => item.roomAmenityId
          ),
      })),

      roomFeatures,
      roomAmenities,
    });
  } catch (error) {
    console.error(
      "GET ROOM TYPES ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load room types",
      },
      { status: 500 }
    );
  }
}

/* =========================================
   POST
========================================= */

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
        { success: false, error: "At least one room type is required." },
        { status: 400 }
      );
    }
    if (
      inputRows.some(
        (row) => row === null || typeof row !== "object" || Array.isArray(row)
      )
    ) {
      return NextResponse.json(
        { success: false, error: "Each room type row must be an object." },
        { status: 400 }
      );
    }

    const records = inputRows as Record<string, unknown>[];
    if (
      records.some(
        (row) =>
          (row.roomFeatureIds !== undefined && !Array.isArray(row.roomFeatureIds)) ||
          (row.roomAmenityIds !== undefined && !Array.isArray(row.roomAmenityIds))
      )
    ) {
      return NextResponse.json(
        { success: false, error: "Room feature and amenity selections must be lists." },
        { status: 400 }
      );
    }

    const rows = records.map((row, index) => ({
      id:
        Number.isInteger(Number(row.id)) && Number(row.id) > 0
          ? Number(row.id)
          : null,
      classification: String(row.classification ?? "").trim(),
      code: String(row.code ?? "").trim(),
      name: String(row.name ?? "").trim(),
      upgradeLevel: Number(row.upgradeLevel),
      displaySequence: Number(row.displaySequence),
      isDefault: row.isDefault === true || row.isDefault === "Yes",
      description: String(row.description ?? "").trim(),
      overBooking: Number(row.overBooking ?? 0),
      roomFeatureIds: Array.isArray(row.roomFeatureIds)
        ? row.roomFeatureIds.map(Number)
        : [],
      roomAmenityIds: Array.isArray(row.roomAmenityIds)
        ? row.roomAmenityIds.map(Number)
        : [],
      sortOrder: index,
    }));

    const classifications = new Set([
      "Room",
      "Pseudo Room",
      "Component Room",
    ]);
    const codes = new Set<string>();
    const names = new Set<string>();
    const upgradeLevels = new Set<number>();
    const displaySequences = new Set<number>();

    for (const row of rows) {
      if (!classifications.has(row.classification)) {
        return NextResponse.json(
          { success: false, error: "Select a valid room classification." },
          { status: 400 }
        );
      }
      if (!row.code || !row.name) {
        return NextResponse.json(
          { success: false, error: "Room type code and name are required." },
          { status: 400 }
        );
      }
      if (
        !Number.isInteger(row.upgradeLevel) ||
        row.upgradeLevel < 0 ||
        !Number.isInteger(row.displaySequence) ||
        row.displaySequence < 0
      ) {
        return NextResponse.json(
          { success: false, error: "Upgrade level and display sequence must be non-negative integers." },
          { status: 400 }
        );
      }
      if (
        !Number.isFinite(row.overBooking) ||
        row.overBooking < 0 ||
        row.overBooking > 100
      ) {
        return NextResponse.json(
          { success: false, error: "Over booking must be between 0 and 100." },
          { status: 400 }
        );
      }
      if (
        row.roomFeatureIds.some((id) => !Number.isInteger(id) || id <= 0) ||
        new Set(row.roomFeatureIds).size !== row.roomFeatureIds.length ||
        row.roomAmenityIds.some((id) => !Number.isInteger(id) || id <= 0) ||
        new Set(row.roomAmenityIds).size !== row.roomAmenityIds.length
      ) {
        return NextResponse.json(
          { success: false, error: "Room feature and amenity selections are invalid." },
          { status: 400 }
        );
      }

      const code = row.code.toLowerCase();
      const name = row.name.toLowerCase();
      if (codes.has(code) || names.has(name)) {
        return NextResponse.json(
          { success: false, error: "Room type codes and names must be unique." },
          { status: 409 }
        );
      }
      if (upgradeLevels.has(row.upgradeLevel)) {
        return NextResponse.json(
          { success: false, error: "Upgrade levels must be unique." },
          { status: 409 }
        );
      }
      if (displaySequences.has(row.displaySequence)) {
        return NextResponse.json(
          { success: false, error: "Display sequences must be unique." },
          { status: 409 }
        );
      }
      codes.add(code);
      names.add(name);
      upgradeLevels.add(row.upgradeLevel);
      displaySequences.add(row.displaySequence);
    }

    if (rows.filter((row) => row.isDefault).length > 1) {
      return NextResponse.json(
        { success: false, error: "Only one Room Type can be default." },
        { status: 400 }
      );
    }

    const existingRows = await prisma.roomType.findMany({
      where: { propertyModuleId: propertyModule.id },
      select: {
        id: true,
        code: true,
        name: true,
        upgradeLevel: true,
        displaySequence: true,
      },
    });
    const existingIds = new Set(existingRows.map((row) => row.id));
    const incomingIds = new Set(
      rows.flatMap((row) => (row.id ? [row.id] : []))
    );

    if (rows.some((row) => row.id && !existingIds.has(row.id))) {
      return NextResponse.json(
        { success: false, error: "A room type row does not belong to this property." },
        { status: 404 }
      );
    }

    for (const row of rows) {
      const duplicate = existingRows.find(
        (existing) =>
          existing.id !== row.id &&
          !incomingIds.has(existing.id) &&
          (existing.code.toLowerCase() === row.code.toLowerCase() ||
            existing.name.toLowerCase() === row.name.toLowerCase() ||
            existing.upgradeLevel === row.upgradeLevel ||
            existing.displaySequence === row.displaySequence)
      );
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: "Room type code, name, upgrade level, and display sequence must be unique." },
          { status: 409 }
        );
      }
    }

    const featureIds = [...new Set(rows.flatMap((row) => row.roomFeatureIds))];
    const amenityIds = [...new Set(rows.flatMap((row) => row.roomAmenityIds))];
    const [validFeatures, validAmenities] = await Promise.all([
      featureIds.length
        ? prisma.roomFeature.findMany({
            where: {
              id: { in: featureIds },
              propertyModuleId: propertyModule.id,
              isActive: true,
            },
            select: { id: true },
          })
        : Promise.resolve([]),
      amenityIds.length
        ? prisma.roomAmenity.findMany({
            where: {
              id: { in: amenityIds },
              propertyModuleId: propertyModule.id,
              isActive: true,
            },
            select: { id: true },
          })
        : Promise.resolve([]),
    ]);

    if (
      validFeatures.length !== featureIds.length ||
      validAmenities.length !== amenityIds.length
    ) {
      return NextResponse.json(
        { success: false, error: "Room types can only use active features and amenities from this property." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const data = {
          classification: row.classification,
          code: row.code,
          name: row.name,
          upgradeLevel: row.upgradeLevel,
          displaySequence: row.displaySequence,
          isDefault: row.isDefault,
          description: row.description || null,
          overBooking: row.overBooking,
        };

        let roomTypeId: number;
        if (row.id && existingIds.has(row.id)) {
          roomTypeId = row.id;
          await tx.roomType.update({
            where: { id: roomTypeId },
            data,
          });
          await tx.roomTypeFeature.deleteMany({ where: { roomTypeId } });
          await tx.roomTypeAmenity.deleteMany({ where: { roomTypeId } });
        } else {
          const created = await tx.roomType.create({
            data: { ...data, propertyModuleId: propertyModule.id },
            select: { id: true },
          });
          roomTypeId = created.id;
        }

        if (row.roomFeatureIds.length > 0) {
          await tx.roomTypeFeature.createMany({
            data: row.roomFeatureIds.map((roomFeatureId) => ({
              roomTypeId,
              roomFeatureId,
            })),
          });
        }
        if (row.roomAmenityIds.length > 0) {
          await tx.roomTypeAmenity.createMany({
            data: row.roomAmenityIds.map((roomAmenityId) => ({
              roomTypeId,
              roomAmenityId,
            })),
          });
        }
      }
    });

    const savedRoomTypes = await prisma.roomType.findMany({
      where: { propertyModuleId: propertyModule.id },
      include: {
        roomTypeFeatures: { select: { roomFeatureId: true } },
        roomTypeAmenities: { select: { roomAmenityId: true } },
      },
      orderBy: { displaySequence: "asc" },
    });

    return NextResponse.json({
      success: true,
      message: "Room types saved successfully",
      roomTypes: savedRoomTypes.map((roomType) => ({
        ...roomType,
        overBooking: Number(roomType.overBooking),
        roomFeatureIds: roomType.roomTypeFeatures.map((item) => item.roomFeatureId),
        roomAmenityIds: roomType.roomTypeAmenities.map((item) => item.roomAmenityId),
      })),
    });
  } catch (error) {
    console.error("SAVE ROOM TYPES ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to save room types.";
    return NextResponse.json(
      { success: false, error: message },
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

export async function DELETE(req: NextRequest) {
  try {
    const propertyModule = await getFomPropertyModule(req);

    if (req.nextUrl.searchParams.get("all") === "true") {
      const result = await prisma.roomType.deleteMany({
        where: { propertyModuleId: propertyModule.id },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid room type row." },
        { status: 400 }
      );
    }

    const result = await prisma.roomType.deleteMany({
      where: { id, propertyModuleId: propertyModule.id },
    });
    if (result.count === 0) {
      return NextResponse.json(
        { success: false, error: "Room type not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE ROOM TYPE ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to delete room type.";
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