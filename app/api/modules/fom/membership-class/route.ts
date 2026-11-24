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

type MembershipClassInput = {
  id: number | null;
  code: string;
  name: string;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRows(value: unknown): MembershipClassInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RouteError("Add at least one membership class row.", 400);
  }
  const rows: MembershipClassInput[] = [];
  for (const valueRow of value) {
    if (!isRecord(valueRow)) {
      throw new RouteError("Each membership class row must be an object.", 400);
    }
    const rawId = valueRow.id;
    const hasId = rawId !== undefined && rawId !== null && rawId !== "";
    const numericId = hasId ? Number(rawId) : 0;
    if (hasId && (!Number.isFinite(numericId) || !Number.isInteger(numericId))) {
      throw new RouteError("A membership class row has an invalid ID.", 400);
    }
    const code = typeof valueRow.code === "string" ? valueRow.code.trim() : "";
    const name = typeof valueRow.name === "string" ? valueRow.name.trim() : "";
    if (!code || !name) {
      throw new RouteError("Code and name are required for every membership class.", 400);
    }
    rows.push({ id: numericId > 0 ? numericId : null, code, name });
  }
  return rows;
}

function errorResponse(error: unknown, operation: string) {
  console.error(`${operation} membership classes failed:`, error);
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
      { success: false, error: "A membership class with this code already exists." },
      { status: 409 }
    );
  }
  return NextResponse.json(
    { success: false, error: `Could not ${operation.toLowerCase()} membership classes.` },
    { status: 500 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const propertyModuleId = await getPropertyModuleId(request);
    const rows = await prisma.membershipClass.findMany({
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
    if (!isRecord(body)) throw new RouteError("Request body must be an object.", 400);

    const rows = parseRows(body.rows);
    const codes = new Set<string>();
    const names = new Set<string>();
    for (const row of rows) {
      const code = row.code.toLowerCase();
      const name = row.name.toLowerCase();
      if (codes.has(code)) throw new RouteError(`Duplicate membership class code "${row.code}".`, 409);
      if (names.has(name)) throw new RouteError(`Duplicate membership class name "${row.name}".`, 409);
      codes.add(code);
      names.add(name);
    }

    const existingRows = await prisma.membershipClass.findMany({
      where: { propertyModuleId },
      select: { id: true, code: true, name: true },
    });
    const existingIds = new Set(existingRows.map((row) => row.id));
    const incomingIds = new Set(rows.flatMap((row) => (row.id ? [row.id] : [])));
    for (const row of rows) {
      if (row.id && !existingIds.has(row.id)) {
        throw new RouteError("A membership class row does not belong to this property.", 404);
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
          `Membership class code or name "${row.code}" already exists.`,
          409
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        if (row.id) {
          await tx.membershipClass.update({
            where: { id: row.id },
            data: { code: `__membership_class_${randomUUID()}` },
          });
        }
      }
      for (const row of rows) {
        const data = { code: row.code, name: row.name };
        if (row.id) {
          await tx.membershipClass.update({ where: { id: row.id }, data });
        } else {
          await tx.membershipClass.create({
            data: { ...data, propertyModuleId },
          });
        }
      }
    });

    const savedRows = await prisma.membershipClass.findMany({
      where: { propertyModuleId },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return NextResponse.json({
      success: true,
      message: "Membership classes saved successfully.",
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
      const membershipTypeCount = await prisma.membershipType.count({
        where: { membershipClass: { propertyModuleId } },
      });
      if (membershipTypeCount > 0) {
        throw new RouteError("Delete membership types before deleting all classes.", 409);
      }
      const result = await prisma.membershipClass.deleteMany({
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
      throw new RouteError("Provide membership class IDs to delete.", 400);
    }
    const ids = body.ids.map(Number);
    if (
      ids.length === 0 ||
      ids.some((id) => !Number.isInteger(id) || id <= 0) ||
      new Set(ids).size !== ids.length
    ) {
      throw new RouteError("Select valid membership class rows to delete.", 400);
    }

    const classes = await prisma.membershipClass.findMany({
      where: { id: { in: ids }, propertyModuleId },
      select: { id: true },
    });
    if (classes.length !== ids.length) {
      throw new RouteError("A membership class does not belong to this property.", 404);
    }
    const membershipTypeCount = await prisma.membershipType.count({
      where: { membershipClassId: { in: ids } },
    });
    if (membershipTypeCount > 0) {
      throw new RouteError("Delete membership types before deleting their class.", 409);
    }

    const result = await prisma.membershipClass.deleteMany({
      where: { id: { in: ids }, propertyModuleId },
    });
    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} membership class row(s) deleted.`,
    });
  } catch (error) {
    return errorResponse(error, "Delete");
  }
}
