import { NextRequest, NextResponse } from "next/server";
import { RevenueClassifications, RevenueType, Sac_Hsn } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

class RouteError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRevenueClassification(value: unknown): value is RevenueClassifications {
  return typeof value === "string" &&
    Object.values(RevenueClassifications).includes(value as RevenueClassifications);
}

function isRevenueType(value: unknown): value is RevenueType {
  return typeof value === "string" && Object.values(RevenueType).includes(value as RevenueType);
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
  console.error(`${operation} revenue failed:`, error);
  if (error instanceof RouteError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
    return NextResponse.json(
      { success: false, error: "A revenue code with this code already exists for this property." },
      { status: 409 }
    );
  }
  return NextResponse.json(
    { success: false, error: `Could not ${operation.toLowerCase()} revenue.` },
    { status: 500 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const propertyModuleId = await getPropertyModuleId(request);
    const rows = await prisma.revenue.findMany({
      where: { propertyModuleId },
      orderBy: [{ displaySequence: "asc" }, { id: "asc" }],
    });
    return NextResponse.json({
      success: true,
      rows: rows.map(({ Sac_Hsn: sacHsn, ...row }) => ({ ...row, sacHsn })),
    });
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
      throw new RouteError("Revenue rows must be an array.", 400);
    }

    const rows: Array<{
      id: number | null;
      code: string;
      name: string;
      classification: RevenueClassifications;
      type: RevenueType;
      sacHsn: Sac_Hsn;
      sacHsnNumber: string;
      displaySequence: number;
      isDefault: boolean;
      isActive: boolean;
    }> = [];
    const ids = new Set<number>();
    const codes = new Set<string>();

    for (const value of body.rows) {
      if (!isRecord(value)) throw new RouteError("Each revenue row must be an object.", 400);
      const rawId = value.id;
      const hasId = rawId !== undefined && rawId !== null && rawId !== "";
      const id = hasId ? Number(rawId) : 0;
      const code = typeof value.code === "string" ? value.code.trim() : "";
      const name = typeof value.name === "string" ? value.name.trim() : "";
      const sacHsnNumber = typeof value.sacHsnNumber === "string" ? value.sacHsnNumber.trim() : "";
      const displaySequence = Number(value.displaySequence);

      if (hasId && !Number.isInteger(id)) {
        throw new RouteError("A revenue row has an invalid ID.", 400);
      }
      if (id > 0 && ids.has(id)) throw new RouteError("Revenue row IDs must be unique.", 400);
      if (id > 0) ids.add(id);
      if (!code || !name || !sacHsnNumber) {
        throw new RouteError("Code, name, and SAC/HSN number are required.", 400);
      }
      if (code.length > 191 || name.length > 191 || sacHsnNumber.length > 191) {
        throw new RouteError("Revenue text fields cannot exceed 191 characters.", 400);
      }
      if (!isRevenueClassification(value.classification)) {
        throw new RouteError("Select a valid revenue classification.", 400);
      }
      if (!isRevenueType(value.type)) throw new RouteError("Select a valid revenue type.", 400);
      if (!isSacHsn(value.sacHsn)) throw new RouteError("Select SAC or HSN.", 400);
      if (!Number.isInteger(displaySequence) || displaySequence < 0) {
        throw new RouteError("Display sequence must be a non-negative whole number.", 400);
      }
      if (typeof value.isDefault !== "boolean" || typeof value.isActive !== "boolean") {
        throw new RouteError("Default and active values must be true or false.", 400);
      }

      const normalizedCode = code.toLowerCase();
      if (codes.has(normalizedCode)) throw new RouteError(`Duplicate revenue code "${code}".`, 409);
      codes.add(normalizedCode);
      rows.push({
        id: id > 0 ? id : null,
        code,
        name,
        classification: value.classification,
        type: value.type,
        sacHsn: value.sacHsn,
        sacHsnNumber,
        displaySequence,
        isDefault: value.isDefault,
        isActive: value.isActive,
      });
    }

    const existingRows = await prisma.revenue.findMany({
      where: { propertyModuleId },
      select: { id: true, code: true },
    });
    const existingIds = new Set(existingRows.map((row) => row.id));
    const incomingIds = new Set(rows.flatMap((row) => row.id === null ? [] : [row.id]));
    for (const row of rows) {
      if (row.id !== null && !existingIds.has(row.id)) {
        throw new RouteError("A revenue row does not belong to this property.", 404);
      }
      const duplicate = existingRows.find((existing) =>
        existing.id !== row.id &&
        !incomingIds.has(existing.id) &&
        existing.code.toLowerCase() === row.code.toLowerCase()
      );
      if (duplicate) throw new RouteError(`Revenue code "${row.code}" already exists.`, 409);
    }

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const data = {
          code: row.code,
          name: row.name,
          classification: row.classification,
          type: row.type,
          Sac_Hsn: row.sacHsn,
          sacHsnNumber: row.sacHsnNumber,
          displaySequence: row.displaySequence,
          isDefault: row.isDefault,
          isActive: row.isActive,
        };
        if (row.id !== null) {
          await tx.revenue.update({ where: { id: row.id }, data });
        } else {
          await tx.revenue.create({ data: { ...data, propertyModuleId } });
        }
      }
    });

    const savedRows = await prisma.revenue.findMany({
      where: { propertyModuleId },
      orderBy: [{ displaySequence: "asc" }, { id: "asc" }],
    });
    return NextResponse.json({
      success: true,
      rows: savedRows.map(({ Sac_Hsn: sacHsn, ...row }) => ({ ...row, sacHsn })),
    });
  } catch (error) {
    return errorResponse(error, "Save");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const propertyModuleId = await getPropertyModuleId(request);
    const idValue = request.nextUrl.searchParams.get("id");
    if (!idValue || !/^[1-9]\d*$/.test(idValue)) {
      throw new RouteError("A valid revenue ID is required.", 400);
    }
    const result = await prisma.revenue.deleteMany({
      where: { id: Number(idValue), propertyModuleId },
    });
    if (result.count === 0) throw new RouteError("Revenue was not found for this property.", 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Delete");
  }
}
