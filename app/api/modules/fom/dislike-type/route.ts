import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

class RouteError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

type DislikeTypeInput = {
  id: number | null;
  code: string;
  name: string;
  displaySequence: number;
  isDefault: boolean;
  isActive: boolean;
};

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
  console.error(`${operation} dislike types failed:`, error);
  if (error instanceof RouteError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status }
    );
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    return NextResponse.json(
      { success: false, error: "A dislike type with this code already exists." },
      { status: 409 }
    );
  }
  return NextResponse.json(
    { success: false, error: `Could not ${operation.toLowerCase()} dislike types.` },
    { status: 500 }
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback: boolean, field: string) {
  if (value === undefined || value === null || value === "") return fallback;
  if (value === true || value === "Yes" || value === "true" || value === 1) return true;
  if (value === false || value === "No" || value === "false" || value === 0) return false;
  throw new RouteError(`${field} must be Yes or No.`, 400);
}

function parseRows(value: unknown): DislikeTypeInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RouteError("Add at least one dislike type row.", 400);
  }

  const parsedRows: DislikeTypeInput[] = [];
  for (const valueRow of value) {
    if (!isRecord(valueRow)) {
      throw new RouteError("Each dislike type row must be an object.", 400);
    }

    const rawId = valueRow.id;
    const hasId = rawId !== undefined && rawId !== null && rawId !== "";
    const numericId = hasId ? Number(rawId) : 0;
    if (hasId && (!Number.isFinite(numericId) || !Number.isInteger(numericId))) {
      throw new RouteError("A dislike type row has an invalid ID.", 400);
    }
    const code = typeof valueRow.code === "string" ? valueRow.code.trim() : "";
    const name = typeof valueRow.name === "string" ? valueRow.name.trim() : "";
    const displaySequence = Number(valueRow.displaySequence);
    if (!code || !name) {
      throw new RouteError("Code and name are required for every dislike type.", 400);
    }
    if (!Number.isInteger(displaySequence) || displaySequence < 0) {
      throw new RouteError("Display sequence must be a non-negative whole number.", 400);
    }

    parsedRows.push({
      id: numericId > 0 ? numericId : null,
      code,
      name,
      displaySequence,
      isDefault: readBoolean(valueRow.isDefault, false, "Is Default"),
      isActive: readBoolean(valueRow.isActive, true, "Is Active"),
    });
  }
  return parsedRows;
}

export async function GET(request: NextRequest) {
  try {
    const propertyModuleId = await getPropertyModuleId(request);
    const rows = await prisma.dislikeType.findMany({
      where: { propertyModuleId },
      orderBy: [{ displaySequence: "asc" }, { name: "asc" }, { id: "asc" }],
    });
    return NextResponse.json({ success: true, rows });
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
    if (!isRecord(body)) throw new RouteError("Request body must be an object.", 400);

    const rows = parseRows(body.rows);
    const codes = new Set<string>();
    const names = new Set<string>();
    if (rows.filter((row) => row.isDefault).length > 1) {
      throw new RouteError("Only one dislike type can be the default.", 400);
    }
    for (const row of rows) {
      const code = row.code.toLowerCase();
      const name = row.name.toLowerCase();
      if (codes.has(code)) throw new RouteError(`Duplicate dislike type code "${row.code}".`, 409);
      if (names.has(name)) throw new RouteError(`Duplicate dislike type name "${row.name}".`, 409);
      codes.add(code);
      names.add(name);
    }

    const existingRows = await prisma.dislikeType.findMany({
      where: { propertyModuleId },
      select: { id: true, code: true, name: true },
    });
    const existingIds = new Set(existingRows.map((row) => row.id));
    const incomingIds = new Set(rows.flatMap((row) => (row.id ? [row.id] : [])));
    for (const row of rows) {
      if (row.id && !existingIds.has(row.id)) {
        throw new RouteError("A dislike type row does not belong to this property.", 404);
      }
      const duplicate = existingRows.find(
        (existing) =>
          existing.id !== row.id &&
          !incomingIds.has(existing.id) &&
          (existing.code.toLowerCase() === row.code.toLowerCase() ||
            existing.name.toLowerCase() === row.name.toLowerCase())
      );
      if (duplicate) {
        throw new RouteError(
          `Dislike type code or name "${row.code}" already exists.`,
          409
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        if (row.id) {
          await tx.dislikeType.update({
            where: { id: row.id },
            data: { code: `__dislike_type_${randomUUID()}` },
          });
        }
      }

      for (const row of rows) {
        if (row.isDefault) {
          await tx.dislikeType.updateMany({
            where: {
              propertyModuleId,
              ...(row.id ? { id: { not: row.id } } : {}),
            },
            data: { isDefault: false },
          });
        }
        const data = {
          code: row.code,
          name: row.name,
          displaySequence: row.displaySequence,
          isDefault: row.isDefault,
          isActive: row.isActive,
        };
        if (row.id) {
          await tx.dislikeType.update({ where: { id: row.id }, data });
        } else {
          await tx.dislikeType.create({ data: { ...data, propertyModuleId } });
        }
      }
    });

    const savedRows = await prisma.dislikeType.findMany({
      where: { propertyModuleId },
      orderBy: [{ displaySequence: "asc" }, { name: "asc" }, { id: "asc" }],
    });
    return NextResponse.json({
      success: true,
      message: "Dislike types saved successfully.",
      rows: savedRows,
    });
  } catch (error) {
    return errorResponse(error, "Save");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const propertyModuleId = await getPropertyModuleId(request);
    if (request.nextUrl.searchParams.get("all") === "true") {
      const result = await prisma.dislikeType.deleteMany({ where: { propertyModuleId } });
      return NextResponse.json({ success: true, count: result.count });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new RouteError("Request body must be valid JSON.", 400);
    }
    if (!isRecord(body) || !Array.isArray(body.ids)) {
      throw new RouteError("Provide dislike type IDs to delete.", 400);
    }
    const ids = body.ids.map(Number);
    if (
      ids.length === 0 ||
      ids.some((id) => !Number.isInteger(id) || id <= 0) ||
      new Set(ids).size !== ids.length
    ) {
      throw new RouteError("Select valid dislike type rows to delete.", 400);
    }

    const result = await prisma.dislikeType.deleteMany({
      where: { id: { in: ids }, propertyModuleId },
    });
    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} dislike type row(s) deleted.`,
    });
  } catch (error) {
    return errorResponse(error, "Delete");
  }
}
