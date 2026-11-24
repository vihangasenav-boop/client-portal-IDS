import { NextRequest, NextResponse } from "next/server";
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
  console.error(`${operation} sections failed:`, error);
  if (error instanceof RouteError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
    return NextResponse.json(
      { success: false, error: "A section with this code already exists for the department." },
      { status: 409 }
    );
  }
  return NextResponse.json(
    { success: false, error: `Could not ${operation.toLowerCase()} sections.` },
    { status: 500 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const propertyModuleId = await getPropertyModuleId(request);
    const [rows, departments] = await Promise.all([
      prisma.sections.findMany({
        where: { department: { propertyModuleId } },
        include: {
          department: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
      prisma.departments.findMany({
        where: { propertyModuleId },
        select: { id: true, code: true, name: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
    ]);

    return NextResponse.json({ success: true, rows, departments });
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
      throw new RouteError("Add at least one section row.", 400);
    }

    const parsed: Array<{
      id: number | null;
      departmentId: number;
      code: string;
      name: string;
      isDefault: boolean;
    }> = [];

    for (const value of body.rows) {
      if (!isRecord(value)) {
        throw new RouteError("Each section row must be an object.", 400);
      }

      const rawId = value.id;
      const hasId = rawId !== undefined && rawId !== null && rawId !== "";
      const id = hasId ? Number(rawId) : 0;
      if (hasId && (!Number.isInteger(id) || id <= 0)) {
        throw new RouteError("A section row has an invalid ID.", 400);
      }

      const departmentId = Number(value.departmentId);
      const code = typeof value.code === "string" ? value.code.trim() : "";
      const name = typeof value.name === "string" ? value.name.trim() : "";

      if (!Number.isInteger(departmentId) || departmentId <= 0) {
        throw new RouteError("A valid department is required for every section.", 400);
      }
      if (!code || !name) {
        throw new RouteError("Code and name are required for every section.", 400);
      }

      parsed.push({
        id: id > 0 ? id : null,
        departmentId,
        code,
        name,
        isDefault: value.isDefault === true,
      });
    }

    for (const departmentGroup of new Set(parsed.map((row) => row.departmentId))) {
      const departmentRows = parsed.filter((row) => row.departmentId === departmentGroup);
      const codes = new Set<string>();
      const names = new Set<string>();
      let defaultCount = 0;

      for (const row of departmentRows) {
        const code = row.code.toLowerCase();
        const name = row.name.toLowerCase();
        if (codes.has(code)) throw new RouteError(`Duplicate section code "${row.code}".`, 409);
        if (names.has(name)) throw new RouteError(`Duplicate section name "${row.name}".`, 409);
        codes.add(code);
        names.add(name);
        if (row.isDefault) defaultCount += 1;
      }
      if (defaultCount > 1) {
        throw new RouteError("Only one section can be default per department.", 400);
      }
    }

    const [existingRows, departments] = await Promise.all([
      prisma.sections.findMany({
        where: { department: { propertyModuleId } },
        select: { id: true, departmentId: true, code: true, name: true },
      }),
      prisma.departments.findMany({
        where: { propertyModuleId },
        select: { id: true },
      }),
    ]);
    const existingById = new Map(existingRows.map((row) => [row.id, row]));
    const departmentIds = new Set(departments.map((row) => row.id));
    const incomingIds = new Set(parsed.flatMap((row) => row.id === null ? [] : [row.id]));

    for (const row of parsed) {
      if (row.id !== null && !existingById.has(row.id)) {
        throw new RouteError("A section row does not belong to this property.", 404);
      }
      if (!departmentIds.has(row.departmentId)) {
        throw new RouteError("The selected department does not belong to this property.", 404);
      }

      const duplicate = existingRows.find((existing) =>
        existing.id !== row.id &&
        !incomingIds.has(existing.id) &&
        existing.departmentId === row.departmentId &&
        (existing.code.toLowerCase() === row.code.toLowerCase() ||
          existing.name.toLowerCase() === row.name.toLowerCase())
      );
      if (duplicate) {
        throw new RouteError(
          `Section code or name "${row.code}" already exists for this department.`,
          409
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const row of parsed) {
        const data = {
          departmentId: row.departmentId,
          code: row.code,
          name: row.name,
          isDefault: row.isDefault,
        };
        if (row.id !== null) {
          await tx.sections.update({ where: { id: row.id }, data });
        } else {
          await tx.sections.create({ data });
        }
      }
    });

    const savedRows = await prisma.sections.findMany({
      where: { department: { propertyModuleId } },
      include: {
        department: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    return NextResponse.json({
      success: true,
      message: "Sections saved successfully.",
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
      const result = await prisma.sections.deleteMany({
        where: { department: { propertyModuleId } },
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
      throw new RouteError("Provide section IDs to delete.", 400);
    }

    const ids = body.ids.map(Number);
    if (
      ids.length === 0 ||
      ids.some((id) => !Number.isInteger(id) || id <= 0) ||
      new Set(ids).size !== ids.length
    ) {
      throw new RouteError("Select valid section rows to delete.", 400);
    }

    const result = await prisma.sections.deleteMany({
      where: { id: { in: ids }, department: { propertyModuleId } },
    });
    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} section row(s) deleted.`,
    });
  } catch (error) {
    return errorResponse(error, "Delete");
  }
}
