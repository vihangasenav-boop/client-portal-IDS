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

type MembershipTypeInput = {
  id: number | null;
  membershipClassId: number;
  code: string;
  name: string;
  displaySequence: number;
  isDefault: boolean;
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

function readBoolean(value: unknown) {
  if (value === undefined || value === null || value === "") return false;
  if (value === true || value === "Yes" || value === "true" || value === 1) return true;
  if (value === false || value === "No" || value === "false" || value === 0) return false;
  throw new RouteError("Is Default must be Yes or No.", 400);
}

function parseRows(value: unknown): MembershipTypeInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RouteError("Add at least one membership type row.", 400);
  }
  const rows: MembershipTypeInput[] = [];
  for (const valueRow of value) {
    if (!isRecord(valueRow)) {
      throw new RouteError("Each membership type row must be an object.", 400);
    }

    const rawId = valueRow.id;
    const hasId = rawId !== undefined && rawId !== null && rawId !== "";
    const numericId = hasId ? Number(rawId) : 0;
    if (hasId && (!Number.isFinite(numericId) || !Number.isInteger(numericId))) {
      throw new RouteError("A membership type row has an invalid ID.", 400);
    }
    const membershipClassId = Number(valueRow.membershipClassId);
    const code = typeof valueRow.code === "string" ? valueRow.code.trim() : "";
    const name = typeof valueRow.name === "string" ? valueRow.name.trim() : "";
    const displaySequence = Number(valueRow.displaySequence);
    if (!Number.isInteger(membershipClassId) || membershipClassId <= 0) {
      throw new RouteError("Select a valid membership class.", 400);
    }
    if (!code || !name) {
      throw new RouteError("Code and name are required for every membership type.", 400);
    }
    if (!Number.isInteger(displaySequence) || displaySequence < 0) {
      throw new RouteError("Display sequence must be a non-negative whole number.", 400);
    }
    rows.push({
      id: numericId > 0 ? numericId : null,
      membershipClassId,
      code,
      name,
      displaySequence,
      isDefault: readBoolean(valueRow.isDefault),
    });
  }
  return rows;
}

function errorResponse(error: unknown, operation: string) {
  console.error(`${operation} membership types failed:`, error);
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
      { success: false, error: "A membership type with this code already exists in its class." },
      { status: 409 }
    );
  }
  return NextResponse.json(
    { success: false, error: `Could not ${operation.toLowerCase()} membership types.` },
    { status: 500 }
  );
}

async function getMembershipTypeData(propertyModuleId: number) {
  const [membershipClasses, rows] = await Promise.all([
    prisma.membershipClass.findMany({
      where: { propertyModuleId },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, code: true, name: true },
    }),
    prisma.membershipType.findMany({
      where: { membershipClass: { propertyModuleId } },
      orderBy: [{ displaySequence: "asc" }, { id: "asc" }],
      select: {
        id: true,
        membershipClassId: true,
        code: true,
        name: true,
        displaySequence: true,
        isDefault: true,
      },
    }),
  ]);
  return { membershipClasses, rows };
}

export async function GET(request: NextRequest) {
  try {
    const propertyModuleId = await getPropertyModuleId(request);
    return NextResponse.json({
      success: true,
      ...(await getMembershipTypeData(propertyModuleId)),
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
    if (!isRecord(body)) throw new RouteError("Request body must be an object.", 400);
    const rows = parseRows(body.rows);

    const membershipClasses = await prisma.membershipClass.findMany({
      where: { propertyModuleId },
      select: { id: true },
    });
    const membershipClassIds = new Set(membershipClasses.map((row) => row.id));
    for (const row of rows) {
      if (!membershipClassIds.has(row.membershipClassId)) {
        throw new RouteError("A membership class does not belong to this property.", 404);
      }
    }

    const codes = new Set<string>();
    const names = new Set<string>();
    const defaults = new Set<number>();
    for (const row of rows) {
      const codeKey = `${row.membershipClassId}:${row.code.toLowerCase()}`;
      const nameKey = `${row.membershipClassId}:${row.name.toLowerCase()}`;
      if (codes.has(codeKey)) {
        throw new RouteError(`Duplicate membership type code "${row.code}" in its class.`, 409);
      }
      if (names.has(nameKey)) {
        throw new RouteError(`Duplicate membership type name "${row.name}" in its class.`, 409);
      }
      codes.add(codeKey);
      names.add(nameKey);
      if (row.isDefault) {
        if (defaults.has(row.membershipClassId)) {
          throw new RouteError("Only one membership type can be default per class.", 400);
        }
        defaults.add(row.membershipClassId);
      }
    }

    const existingRows = await prisma.membershipType.findMany({
      where: { membershipClass: { propertyModuleId } },
      select: { id: true, membershipClassId: true, code: true, name: true },
    });
    const existingById = new Map(existingRows.map((row) => [row.id, row]));
    const incomingIds = new Set(rows.flatMap((row) => (row.id ? [row.id] : [])));
    for (const row of rows) {
      const existing = row.id ? existingById.get(row.id) : undefined;
      if (row.id && !existing) {
        throw new RouteError("A membership type row does not belong to this property.", 404);
      }
      const duplicate = existingRows.find(
        (candidate) =>
          candidate.membershipClassId === row.membershipClassId &&
          candidate.id !== row.id &&
          !incomingIds.has(candidate.id) &&
          (candidate.code.toLowerCase() === row.code.toLowerCase() ||
            candidate.name.toLowerCase() === row.name.toLowerCase())
      );
      if (duplicate) {
        throw new RouteError(
          `Membership type code or name "${row.code}" already exists in its class.`,
          409
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        if (row.id) {
          await tx.membershipType.update({
            where: { id: row.id },
            data: { code: `__membership_type_${randomUUID()}` },
          });
        }
      }
      for (const row of rows) {
        if (row.isDefault) {
          await tx.membershipType.updateMany({
            where: {
              membershipClassId: row.membershipClassId,
              ...(row.id ? { id: { not: row.id } } : {}),
            },
            data: { isDefault: false },
          });
        }
        const data = {
          membershipClassId: row.membershipClassId,
          code: row.code,
          name: row.name,
          displaySequence: row.displaySequence,
          isDefault: row.isDefault,
        };
        if (row.id) {
          await tx.membershipType.update({ where: { id: row.id }, data });
        } else {
          await tx.membershipType.create({ data });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Membership types saved successfully.",
      ...(await getMembershipTypeData(propertyModuleId)),
    });
  } catch (error) {
    return errorResponse(error, "Save");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const propertyModuleId = await getPropertyModuleId(request);
    if (request.nextUrl.searchParams.get("all") === "true") {
      const result = await prisma.membershipType.deleteMany({
        where: { membershipClass: { propertyModuleId } },
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
      throw new RouteError("Provide membership type IDs to delete.", 400);
    }
    const ids = body.ids.map(Number);
    if (
      ids.length === 0 ||
      ids.some((id) => !Number.isInteger(id) || id <= 0) ||
      new Set(ids).size !== ids.length
    ) {
      throw new RouteError("Select valid membership type rows to delete.", 400);
    }

    const result = await prisma.membershipType.deleteMany({
      where: { id: { in: ids }, membershipClass: { propertyModuleId } },
    });
    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} membership type row(s) deleted.`,
    });
  } catch (error) {
    return errorResponse(error, "Delete");
  }
}
