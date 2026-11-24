import { Group, Sac_Hsn } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

class RouteError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGroup(value: unknown): value is Group {
  return typeof value === "string" && Object.values(Group).includes(value as Group);
}

function isSacHsn(value: unknown): value is Sac_Hsn {
  return typeof value === "string" && Object.values(Sac_Hsn).includes(value as Sac_Hsn);
}

async function getPropertyModuleId(request: NextRequest) {
  const token = request.cookies.get("client-token")?.value;
  if (!token) throw new RouteError("Not authenticated.", 401);

  const decoded = verifyToken(token);
  if (!decoded) throw new RouteError("Invalid or expired session.", 401);
  if (!["CLIENT", "PROPERTY_ADMIN"].includes(decoded.role)) {
    throw new RouteError("Invalid client session.", 403);
  }

  const userId = Number(decoded.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new RouteError("Invalid user ID.", 401);
  }

  const user = await prisma.propertyUsers.findUnique({
    where: { id: userId },
    select: { propertyId: true },
  });
  if (!user) throw new RouteError("User not found.", 404);

  const propertyModule = await prisma.propertyModule.findFirst({
    where: {
      propertyId: user.propertyId,
      module: { code: "FOM", isActive: true },
    },
    select: { id: true },
  });
  if (!propertyModule) throw new RouteError("Property module not found.", 404);
  return propertyModule.id;
}

function errorResponse(error: unknown, operation: string) {
  console.error(`${operation} revenue groups failed:`, error);
  if (error instanceof RouteError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
    return NextResponse.json(
      { success: false, error: "A revenue group with this code already exists for this property." },
      { status: 409 }
    );
  }
  return NextResponse.json(
    { success: false, error: `Could not ${operation.toLowerCase()} revenue groups.` },
    { status: 500 }
  );
}

async function readRevenueGroups(propertyModuleId: number) {
  const [rows, revenues] = await Promise.all([
    prisma.revenueGroup.findMany({
      where: { propertyModuleId },
      include: {
        revenueName: { select: { id: true, code: true, name: true, isActive: true } },
      },
      orderBy: [{ id: "asc" }],
    }),
    prisma.revenue.findMany({
      where: { propertyModuleId },
      select: { id: true, code: true, name: true, isActive: true },
      orderBy: [{ displaySequence: "asc" }, { code: "asc" }],
    }),
  ]);
  return { rows, revenues };
}

export async function GET(request: NextRequest) {
  try {
    const propertyModuleId = await getPropertyModuleId(request);
    const { rows, revenues } = await readRevenueGroups(propertyModuleId);
    return NextResponse.json({ success: true, rows, revenues });
  } catch (error) {
    return errorResponse(error, "Load");
  }
}

export async function POST(request: NextRequest) {
  try {
    const propertyModuleId = await getPropertyModuleId(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new RouteError("Request body must be valid JSON.", 400);
    }
    if (!isRecord(body) || !Array.isArray(body.rows)) {
      throw new RouteError("Revenue group rows must be an array.", 400);
    }

    const rows: Array<{
      id: number | null;
      code: string;
      name: string;
      classification: Group;
      revenueIds: number[];
      sacHsn: Sac_Hsn;
      sacHsnNumber: string;
      isDefault: boolean;
      isActive: boolean;
    }> = [];
    const rowIds = new Set<number>();
    const codes = new Set<string>();

    for (const value of body.rows) {
      if (!isRecord(value)) throw new RouteError("Each revenue group row must be an object.", 400);
      const hasId = value.id !== undefined && value.id !== null && value.id !== "";
      const id = hasId ? Number(value.id) : 0;
      const code = typeof value.code === "string" ? value.code.trim() : "";
      const name = typeof value.name === "string" ? value.name.trim() : "";
      const sacHsnNumber = typeof value.sacHsnNumber === "string" ? value.sacHsnNumber.trim() : "";
      const revenueIds = value.revenueIds;

      if (hasId && !Number.isInteger(id)) throw new RouteError("A revenue group has an invalid ID.", 400);
      if (id > 0 && rowIds.has(id)) throw new RouteError("Revenue group IDs must be unique.", 400);
      if (id > 0) rowIds.add(id);
      if (!code || !name) throw new RouteError("Code and name are required for every revenue group.", 400);
      if (code.length > 191 || name.length > 191 || sacHsnNumber.length > 191) {
        throw new RouteError("Revenue group text fields cannot exceed 191 characters.", 400);
      }
      if (!isGroup(value.revenueGroupClassification)) {
        throw new RouteError("Select a valid revenue group classification.", 400);
      }
      if (!isSacHsn(value.sacHsn)) throw new RouteError("Select SAC or HSN.", 400);
      if (!Array.isArray(revenueIds) || revenueIds.length === 0) {
        throw new RouteError("Select at least one revenue for every group.", 400);
      }
      if (
        revenueIds.some((revenueId) => !Number.isInteger(revenueId) || revenueId <= 0) ||
        new Set(revenueIds).size !== revenueIds.length
      ) {
        throw new RouteError("Revenue selections must contain unique valid IDs.", 400);
      }
      if (typeof value.isDefault !== "boolean" || typeof value.isActive !== "boolean") {
        throw new RouteError("Default and active values must be true or false.", 400);
      }

      const normalizedCode = code.toLowerCase();
      if (codes.has(normalizedCode)) throw new RouteError(`Duplicate revenue group code "${code}".`, 409);
      codes.add(normalizedCode);
      rows.push({
        id: id > 0 ? id : null,
        code,
        name,
        classification: value.revenueGroupClassification,
        revenueIds: revenueIds as number[],
        sacHsn: value.sacHsn,
        sacHsnNumber,
        isDefault: value.isDefault,
        isActive: value.isActive,
      });
    }

    const [existingGroups, availableRevenues] = await Promise.all([
      prisma.revenueGroup.findMany({
        where: { propertyModuleId },
        select: { id: true, code: true },
      }),
      prisma.revenue.findMany({
        where: {
          propertyModuleId,
          id: { in: [...new Set(rows.flatMap((row) => row.revenueIds))] },
        },
        select: { id: true },
      }),
    ]);
    const existingIds = new Set(existingGroups.map((row) => row.id));
    const incomingIds = new Set(rows.flatMap((row) => row.id === null ? [] : [row.id]));
    const availableRevenueIds = new Set(availableRevenues.map((row) => row.id));
    for (const row of rows) {
      if (row.id !== null && !existingIds.has(row.id)) {
        throw new RouteError("A revenue group does not belong to this property.", 404);
      }
      if (row.revenueIds.some((revenueId) => !availableRevenueIds.has(revenueId))) {
        throw new RouteError("Select revenues that belong to this property.", 400);
      }
      const duplicate = existingGroups.find((existing) =>
        existing.id !== row.id &&
        !incomingIds.has(existing.id) &&
        existing.code.toLowerCase() === row.code.toLowerCase()
      );
      if (duplicate) throw new RouteError(`Revenue group code "${row.code}" already exists.`, 409);
    }

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const data = {
          code: row.code,
          name: row.name,
          revenueGroupClassification: row.classification,
          Sac_Hsn: row.sacHsn,
          sacHsnNumber: row.sacHsnNumber,
          isDefault: row.isDefault,
          isActive: row.isActive,
          revenueName: { set: row.revenueIds.map((id) => ({ id })) },
        };
        if (row.id !== null) {
          await tx.revenueGroup.update({ where: { id: row.id }, data });
        } else {
          await tx.revenueGroup.create({
            data: {
              ...data,
              propertyModuleId,
              revenueName: { connect: row.revenueIds.map((id) => ({ id })) },
            },
          });
        }
      }
    });

    const { rows: savedRows, revenues } = await readRevenueGroups(propertyModuleId);
    return NextResponse.json({ success: true, rows: savedRows, revenues });
  } catch (error) {
    return errorResponse(error, "Save");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const propertyModuleId = await getPropertyModuleId(request);
    const idValue = request.nextUrl.searchParams.get("id");
    if (!idValue || !/^[1-9]\d*$/.test(idValue)) {
      throw new RouteError("A valid revenue group ID is required.", 400);
    }
    const result = await prisma.revenueGroup.deleteMany({
      where: { id: Number(idValue), propertyModuleId },
    });
    if (result.count === 0) throw new RouteError("Revenue group was not found for this property.", 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Delete");
  }
}
