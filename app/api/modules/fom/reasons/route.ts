import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

class RouteError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const departmentModuleMap = {
  "Front Office": "FrontOffice",
  "Point of Sale": "PointOfSale",
  Housekeeping: "Housekeeping",
  "Sales & Marketing": "SalesMarketing",
  Finance: "Finance",
} as const;

const operationMap = {
  "Cancel Reservations": "CancelReservations",
  "Delete Reservations": "DeleteReservations",
} as const;

const departmentModuleLabels = {
  FrontOffice: "Front Office",
  PointOfSale: "Point of Sale",
  Housekeeping: "Housekeeping",
  SalesMarketing: "Sales & Marketing",
  Finance: "Finance",
} as const;

const operationLabels = {
  CancelReservations: "Cancel Reservations",
  DeleteReservations: "Delete Reservations",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  console.error(`${operation} reasons failed:`, error);
  if (error instanceof RouteError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
    return NextResponse.json(
      { success: false, error: "A reason with this code already exists." },
      { status: 409 }
    );
  }
  return NextResponse.json(
    { success: false, error: `Could not ${operation.toLowerCase()} reasons.` },
    { status: 500 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const propertyModuleId = await getPropertyModuleId(request);
    const rows = await prisma.reasons.findMany({
      where: { propertyModuleId },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return NextResponse.json({
      success: true,
      rows: rows.map((row) => ({
        ...row,
        departmentModule: departmentModuleLabels[row.departmentModule],
        operations: operationLabels[row.operations],
      })),
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
    if (!isRecord(body) || !Array.isArray(body.rows) || body.rows.length === 0) {
      throw new RouteError("Add at least one reason row.", 400);
    }

    const parsed: Array<{
      id: number | null;
      code: string;
      name: string;
      departmentModule: keyof typeof departmentModuleMap;
      operations: keyof typeof operationMap;
    }> = [];

    for (const value of body.rows) {
      if (!isRecord(value)) {
        throw new RouteError("Each reason row must be an object.", 400);
      }
      const rawId = value.id;
      const hasId = rawId !== undefined && rawId !== null && rawId !== "";
      const id = hasId ? Number(rawId) : 0;
      if (hasId && (!Number.isInteger(id) || id <= 0)) {
        throw new RouteError("A reason row has an invalid ID.", 400);
      }

      const code = typeof value.code === "string" ? value.code.trim() : "";
      const name = typeof value.name === "string" ? value.name.trim() : "";
      const departmentModule = value.departmentModule;
      const operations = value.operations;
      if (!code || !name) {
        throw new RouteError("Code and name are required for every reason.", 400);
      }
      if (typeof departmentModule !== "string" || !(departmentModule in departmentModuleMap)) {
        throw new RouteError("A valid department module is required.", 400);
      }
      if (typeof operations !== "string" || !(operations in operationMap)) {
        throw new RouteError("A valid operation is required.", 400);
      }

      parsed.push({
        id: id > 0 ? id : null,
        code,
        name,
        departmentModule: departmentModule as keyof typeof departmentModuleMap,
        operations: operations as keyof typeof operationMap,
      });
    }

    const codes = new Set<string>();
    const names = new Set<string>();
    for (const row of parsed) {
      const code = row.code.toLowerCase();
      const name = row.name.toLowerCase();
      if (codes.has(code)) throw new RouteError(`Duplicate reason code "${row.code}".`, 409);
      if (names.has(name)) throw new RouteError(`Duplicate reason name "${row.name}".`, 409);
      codes.add(code);
      names.add(name);
    }

    const existingRows = await prisma.reasons.findMany({
      where: { propertyModuleId },
      select: { id: true, code: true, name: true },
    });
    const existingById = new Map(existingRows.map((row) => [row.id, row]));
    const incomingIds = new Set(parsed.flatMap((row) => row.id === null ? [] : [row.id]));

    for (const row of parsed) {
      if (row.id !== null && !existingById.has(row.id)) {
        throw new RouteError("A reason row does not belong to this property.", 404);
      }
      const duplicate = existingRows.find((existing) =>
        existing.id !== row.id &&
        !incomingIds.has(existing.id) &&
        (existing.code.toLowerCase() === row.code.toLowerCase() ||
          existing.name.toLowerCase() === row.name.toLowerCase())
      );
      if (duplicate) {
        throw new RouteError(`Reason code or name "${row.code}" already exists.`, 409);
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const row of parsed) {
        const data = {
          code: row.code,
          name: row.name,
          departmentModule: departmentModuleMap[row.departmentModule],
          operations: operationMap[row.operations],
        };
        if (row.id !== null) {
          await tx.reasons.update({ where: { id: row.id }, data });
        } else {
          await tx.reasons.create({ data: { ...data, propertyModuleId } });
        }
      }
    });

    const savedRows = await prisma.reasons.findMany({
      where: { propertyModuleId },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return NextResponse.json({
      success: true,
      message: "Reasons saved successfully.",
      rows: savedRows.map((row) => ({
        ...row,
        departmentModule: departmentModuleLabels[row.departmentModule],
        operations: operationLabels[row.operations],
      })),
    });
  } catch (error) {
    return errorResponse(error, "Save");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const propertyModuleId = await getPropertyModuleId(request);
    if (request.nextUrl.searchParams.get("all") === "true") {
      const result = await prisma.reasons.deleteMany({ where: { propertyModuleId } });
      return NextResponse.json({ success: true, count: result.count });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new RouteError("Request body must be valid JSON.", 400);
    }
    if (!isRecord(body) || !Array.isArray(body.ids)) {
      throw new RouteError("Provide reason IDs to delete.", 400);
    }

    const ids = body.ids.map(Number);
    if (
      ids.length === 0 ||
      ids.some((id) => !Number.isInteger(id) || id <= 0) ||
      new Set(ids).size !== ids.length
    ) {
      throw new RouteError("Select valid reason rows to delete.", 400);
    }

    const result = await prisma.reasons.deleteMany({
      where: { id: { in: ids }, propertyModuleId },
    });
    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} reason row(s) deleted.`,
    });
  } catch (error) {
    return errorResponse(error, "Delete");
  }
}
