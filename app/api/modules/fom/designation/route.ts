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

type DesignationInput = {
  id: number | null;
  code: string;
  name: string;
  type: "Hotel" | "Guest";
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
  console.error(`${operation} designations failed:`, error);
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
      { success: false, error: "A designation with this code already exists." },
      { status: 409 }
    );
  }
  return NextResponse.json(
    { success: false, error: `Could not ${operation.toLowerCase()} designations.` },
    { status: 500 }
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRows(value: unknown): DesignationInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RouteError("Add at least one designation row.", 400);
  }

  const recordRows: Record<string, unknown>[] = [];
  for (const row of value) {
    if (!isRecord(row)) {
      throw new RouteError("Each designation row must be an object.", 400);
    }
    recordRows.push(row);
  }

  return recordRows.map((row) => {
    const rawId = row.id;
    const hasId = rawId !== undefined && rawId !== null && rawId !== "";
    const numericId = hasId ? Number(rawId) : 0;
    if (hasId && (!Number.isFinite(numericId) || !Number.isInteger(numericId))) {
      throw new RouteError("A designation row has an invalid ID.", 400);
    }

    const code = typeof row.code === "string" ? row.code.trim() : "";
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const rawType = row.type ?? row.Type;
    if (!code || !name) {
      throw new RouteError("Code and name are required for every designation.", 400);
    }
    if (rawType !== "Hotel" && rawType !== "Guest") {
      throw new RouteError("Designation type must be Hotel or Guest.", 400);
    }

    return {
      id: numericId > 0 ? numericId : null,
      code,
      name,
      type: rawType,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const propertyModuleId = await getPropertyModuleId(request);
    const rows = await prisma.designations.findMany({
      where: { propertyModuleId },
      orderBy: [{ name: "asc" }, { id: "asc" }],
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

    if (!isRecord(body)) {
      throw new RouteError("Request body must be an object.", 400);
    }

    const rows = parseRows(body.rows);
    const codeKeys = new Set<string>();
    const nameKeys = new Set<string>();

    for (const row of rows) {
      const codeKey = row.code.toLowerCase();
      const nameKey = row.name.toLowerCase();
      if (codeKeys.has(codeKey)) {
        throw new RouteError(`Duplicate designation code "${row.code}".`, 409);
      }
      if (nameKeys.has(nameKey)) {
        throw new RouteError(`Duplicate designation name "${row.name}".`, 409);
      }
      codeKeys.add(codeKey);
      nameKeys.add(nameKey);
    }

    const existingRows = await prisma.designations.findMany({
      where: { propertyModuleId },
      select: { id: true, code: true, name: true },
    });
    const existingById = new Map(existingRows.map((row) => [row.id, row]));
    const incomingIds = new Set(
      rows.flatMap((row) => (row.id === null ? [] : [row.id]))
    );

    for (const row of rows) {
      if (row.id !== null && !existingById.has(row.id)) {
        throw new RouteError(
          "A designation row does not belong to this property.",
          404
        );
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
          `Designation code or name "${row.code}" already exists.`,
          409
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      const existingUpdates = rows.filter(
        (row): row is DesignationInput & { id: number } =>
          row.id !== null && existingById.has(row.id)
      );

      for (const row of existingUpdates) {
        await tx.designations.update({
          where: { id: row.id },
          data: { code: `__designation_${randomUUID()}`, name: row.name },
        });
      }

      for (const row of rows) {
        const data = {
          code: row.code,
          name: row.name,
          Type: row.type,
        };
        if (row.id !== null) {
          await tx.designations.update({
            where: { id: row.id },
            data,
          });
        } else {
          await tx.designations.create({
            data: { ...data, propertyModuleId },
          });
        }
      }
    });

    const savedRows = await prisma.designations.findMany({
      where: { propertyModuleId },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    return NextResponse.json({
      success: true,
      message: "Designations saved successfully.",
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
      const result = await prisma.designations.deleteMany({
        where: { propertyModuleId },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new RouteError("Request body must be valid JSON.", 400);
    }
    if (!isRecord(body) || !Array.isArray(body.ids)) {
      throw new RouteError("Provide designation IDs to delete.", 400);
    }

    const ids = body.ids.map(Number);
    if (
      ids.length === 0 ||
      ids.some((id) => !Number.isInteger(id) || id <= 0) ||
      new Set(ids).size !== ids.length
    ) {
      throw new RouteError("Select valid designation rows to delete.", 400);
    }

    const result = await prisma.designations.deleteMany({
      where: { id: { in: ids }, propertyModuleId },
    });
    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} designation row(s) deleted.`,
    });
  } catch (error) {
    return errorResponse(error, "Delete");
  }
}
