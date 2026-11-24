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

function toDate(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new RouteError(`${field} is required for every offer.`, 400);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RouteError(`${field} is invalid.`, 400);
  }
  return date;
}

function errorResponse(error: unknown, operation: string) {
  console.error(`${operation} offers failed:`, error);
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
      { success: false, error: "An offer with this code already exists." },
      { status: 409 }
    );
  }
  return NextResponse.json(
    { success: false, error: `Could not ${operation.toLowerCase()} offers.` },
    { status: 500 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const propertyModuleId = await getPropertyModuleId(request);
    const rows = await prisma.offers.findMany({
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
    if (!isRecord(body) || !Array.isArray(body.rows) || body.rows.length === 0) {
      throw new RouteError("Add at least one offer row.", 400);
    }

    const parsed: Array<{
      id: number | null;
      code: string;
      name: string;
      description: string;
      startDate: Date;
      endDate: Date;
    }> = [];

    for (const value of body.rows) {
      if (!isRecord(value)) {
        throw new RouteError("Each offer row must be an object.", 400);
      }

      const rawId = value.id;
      const hasId = rawId !== undefined && rawId !== null && rawId !== "";
      const id = hasId ? Number(rawId) : 0;
      if (hasId && (!Number.isInteger(id) || id <= 0)) {
        throw new RouteError("An offer row has an invalid ID.", 400);
      }

      const code = typeof value.code === "string" ? value.code.trim() : "";
      const name = typeof value.name === "string" ? value.name.trim() : "";
      const description =
        typeof value.description === "string" ? value.description.trim() : "";
      if (!code || !name) {
        throw new RouteError("Code and name are required for every offer.", 400);
      }

      const startDate = toDate(value.startDate, "Start date");
      const endDate = toDate(value.endDate, "End date");
      if (endDate < startDate) {
        throw new RouteError("End date must be on or after start date.", 400);
      }

      parsed.push({
        id: id > 0 ? id : null,
        code,
        name,
        description,
        startDate,
        endDate,
      });
    }

    const codes = new Set<string>();
    const names = new Set<string>();
    for (const row of parsed) {
      const code = row.code.toLowerCase();
      const name = row.name.toLowerCase();
      if (codes.has(code)) {
        throw new RouteError(`Duplicate offer code "${row.code}".`, 409);
      }
      if (names.has(name)) {
        throw new RouteError(`Duplicate offer name "${row.name}".`, 409);
      }
      codes.add(code);
      names.add(name);
    }

    const existingRows = await prisma.offers.findMany({
      where: { propertyModuleId },
      select: { id: true, code: true, name: true },
    });
    const existingById = new Map(
      existingRows.map((row) => [row.id, row])
    );
    const incomingIds = new Set(
      parsed.flatMap((row) => (row.id === null ? [] : [row.id]))
    );

    for (const row of parsed) {
      if (row.id !== null && !existingById.has(row.id)) {
        throw new RouteError(
          "An offer row does not belong to this property.",
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
          `Offer code or name "${row.code}" already exists.`,
          409
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const row of parsed) {
        const data = {
          code: row.code,
          name: row.name,
          description: row.description,
          startDate: row.startDate,
          endDate: row.endDate,
        };
        if (row.id !== null) {
          await tx.offers.update({
            where: { id: row.id },
            data,
          });
        } else {
          await tx.offers.create({
            data: {
              code: row.code,
              name: row.name,
              description: row.description,
              startDate: row.startDate,
              endDate: row.endDate,
              propertyModule: {
                connect: { id: propertyModuleId },
              },
            },
          });
        }
      }
    });

    const savedRows = await prisma.offers.findMany({
      where: { propertyModuleId },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return NextResponse.json({
      success: true,
      message: "Offers saved successfully.",
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
      const result = await prisma.offers.deleteMany({
        where: { propertyModuleId },
      });
      return NextResponse.json({
        success: true,
        count: result.count,
      });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new RouteError(
        "Request body must be valid JSON.",
        400
      );
    }
    if (!isRecord(body) || !Array.isArray(body.ids)) {
      throw new RouteError("Provide offer IDs to delete.", 400);
    }

    const ids = body.ids.map(Number);
    if (
      ids.length === 0 ||
      ids.some((id) => !Number.isInteger(id) || id <= 0) ||
      new Set(ids).size !== ids.length
    ) {
      throw new RouteError("Select valid offer rows to delete.", 400);
    }

    const result = await prisma.offers.deleteMany({
      where: { id: { in: ids }, propertyModuleId },
    });
    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} offer row(s) deleted.`,
    });
  } catch (error) {
    return errorResponse(error, "Delete");
  }
}
