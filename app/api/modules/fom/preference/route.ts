import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

async function getFomPropertyModule(req: NextRequest) {
  const token = req.cookies.get("client-token")?.value;
  if (!token) throw new Error("Not authenticated");

  const decoded = verifyToken(token);
  if (!decoded) throw new Error("Invalid or expired session");
  if (decoded.role !== "CLIENT" && decoded.role !== "PROPERTY_ADMIN") {
    throw new Error("Invalid client session");
  }

  const userId = Number(decoded.id);
  if (!Number.isInteger(userId)) throw new Error("Invalid user ID");

  const user = await prisma.propertyUsers.findUnique({
    where: { id: userId },
    select: { propertyId: true },
  });
  if (!user) throw new Error("User not found");

  const propertyModule = await prisma.propertyModule.findFirst({
    where: {
      propertyId: user.propertyId,
      module: { code: "FOM", isActive: true },
    },
    select: { id: true },
  });
  if (!propertyModule) throw new Error("Property module not found");

  return propertyModule;
}

function errorResponse(error: unknown, operation: string) {
  console.error(`${operation} PREFERENCES ERROR:`, error);
  const message = error instanceof Error ? error.message : "Request failed.";
  const status =
    message === "Not authenticated" || message === "Invalid or expired session"
      ? 401
      : message === "Invalid client session"
        ? 403
        : message === "User not found" || message === "Property module not found"
          ? 404
          : typeof error === "object" &&
              error !== null &&
              "code" in error &&
              error.code === "P2002"
            ? 409
            : 500;

  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const propertyModule = await getFomPropertyModule(req);
    const [preferenceGroups, preferences] = await Promise.all([
      prisma.preferenceGroups.findMany({
        where: { propertyModuleId: propertyModule.id },
        orderBy: [{ id: "asc" }],
        select: { id: true, code: true, name: true },
      }),
      prisma.preference.findMany({
        where: { preferenceGroup: { propertyModuleId: propertyModule.id } },
        orderBy: [{ displaySequence: "asc" }, { id: "asc" }],
        include: {
          preferenceGroup: {
            select: { id: true, code: true, name: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      propertyModuleId: propertyModule.id,
      preferenceGroups,
      preferences,
    });
  } catch (error) {
    return errorResponse(error, "GET");
  }
}

export async function POST(req: NextRequest) {
  try {
    const propertyModule = await getFomPropertyModule(req);
    const body = await req.json();
    if (!Array.isArray(body?.rows)) {
      return NextResponse.json(
        { success: false, error: "Rows must be an array." },
        { status: 400 }
      );
    }
    if (body.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Add at least one preference." },
        { status: 400 }
      );
    }
    if (
      body.rows.some(
        (row: unknown) =>
          row === null || typeof row !== "object" || Array.isArray(row)
      )
    ) {
      return NextResponse.json(
        { success: false, error: "Each preference row must be an object." },
        { status: 400 }
      );
    }

    const rows = (body.rows as Record<string, unknown>[]).map((row) => {
      const rawId = Number(row.id);
      return {
        id: Number.isInteger(rawId) && rawId > 0 ? rawId : null,
        hasInvalidId: rawId > 0 && !Number.isInteger(rawId),
        preferenceGroupId: Number(row.preferenceGroupId),
        code: String(row.code ?? "").trim(),
        name: String(row.name ?? "").trim(),
        displaySequence: Number(row.displaySequence),
        isDefault: row.isDefault === true || row.isDefault === "Yes",
      };
    });

    const preferenceGroups = await prisma.preferenceGroups.findMany({
      where: { propertyModuleId: propertyModule.id },
      select: { id: true },
    });
    const groupIds = new Set(preferenceGroups.map((group) => group.id));
    const errors: string[] = [];
    for (const [index, row] of rows.entries()) {
      if (row.hasInvalidId) errors.push(`Row ${index + 1}: invalid ID.`);
      if (!Number.isInteger(row.preferenceGroupId) || !groupIds.has(row.preferenceGroupId)) {
        errors.push(`Row ${index + 1}: preference group is not part of this property.`);
      }
      if (!row.code) errors.push(`Row ${index + 1}: code is required.`);
      if (!row.name) errors.push(`Row ${index + 1}: name is required.`);
      if (!Number.isInteger(row.displaySequence) || row.displaySequence < 0) {
        errors.push(`Row ${index + 1}: display sequence must be a non-negative integer.`);
      }
    }
    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: "Validation failed.", errors },
        { status: 400 }
      );
    }

    const ids = rows.flatMap((row) => row.id ? [row.id] : []);
    if (new Set(ids).size !== ids.length) {
      return NextResponse.json(
        { success: false, error: "Duplicate preference row ID." },
        { status: 400 }
      );
    }

    const codes = new Set<string>();
    const names = new Set<string>();
    const defaults = new Set<number>();
    for (const row of rows) {
      const codeKey = `${row.preferenceGroupId}:${row.code.toLowerCase()}`;
      const nameKey = `${row.preferenceGroupId}:${row.name.toLowerCase()}`;
      if (codes.has(codeKey)) {
        return NextResponse.json(
          { success: false, error: `Duplicate preference code "${row.code}" in its group.` },
          { status: 409 }
        );
      }
      if (names.has(nameKey)) {
        return NextResponse.json(
          { success: false, error: `Duplicate preference name "${row.name}" in its group.` },
          { status: 409 }
        );
      }
      codes.add(codeKey);
      names.add(nameKey);

      if (row.isDefault) {
        if (defaults.has(row.preferenceGroupId)) {
          return NextResponse.json(
            { success: false, error: "Only one preference can be default per group." },
            { status: 400 }
          );
        }
        defaults.add(row.preferenceGroupId);
      }
    }

    const existingRows = await prisma.preference.findMany({
      where: { preferenceGroup: { propertyModuleId: propertyModule.id } },
      select: { id: true, code: true, name: true, preferenceGroupId: true },
    });
    const existingById = new Map(existingRows.map((row) => [row.id, row]));
    const incomingIds = new Set(ids);
    if (rows.some((row) => row.id && !existingById.has(row.id))) {
      return NextResponse.json(
        { success: false, error: "A preference row does not belong to this property." },
        { status: 404 }
      );
    }

    for (const row of rows) {
      const duplicate = existingRows.find(
        (existing) =>
          existing.preferenceGroupId === row.preferenceGroupId &&
          existing.id !== row.id &&
          !incomingIds.has(existing.id) &&
          (existing.code.toLowerCase() === row.code.toLowerCase() ||
            existing.name.toLowerCase() === row.name.toLowerCase())
      );
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: `Preference code or name "${row.code}" already exists in this group.` },
          { status: 409 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        if (row.isDefault) {
          await tx.preference.updateMany({
            where: {
              preferenceGroupId: row.preferenceGroupId,
              ...(row.id ? { id: { not: row.id } } : {}),
            },
            data: { isDefault: false },
          });
        }

        const data = {
          preferenceGroupId: row.preferenceGroupId,
          code: row.code,
          name: row.name,
          displaySequence: row.displaySequence,
          isDefault: row.isDefault,
        };
        if (row.id) {
          await tx.preference.update({ where: { id: row.id }, data });
        } else {
          await tx.preference.create({ data });
        }
      }
    });

    const [savedGroups, preferences] = await Promise.all([
      prisma.preferenceGroups.findMany({
        where: { propertyModuleId: propertyModule.id },
        orderBy: [{ id: "asc" }],
        select: { id: true, code: true, name: true },
      }),
      prisma.preference.findMany({
        where: { preferenceGroup: { propertyModuleId: propertyModule.id } },
        orderBy: [{ displaySequence: "asc" }, { id: "asc" }],
        include: {
          preferenceGroup: {
            select: { id: true, code: true, name: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      propertyModuleId: propertyModule.id,
      preferenceGroups: savedGroups,
      preferences,
    });
  } catch (error) {
    return errorResponse(error, "SAVE");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const propertyModule = await getFomPropertyModule(req);
    if (req.nextUrl.searchParams.get("all") === "true") {
      const result = await prisma.preference.deleteMany({
        where: { preferenceGroup: { propertyModuleId: propertyModule.id } },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid preference row." },
        { status: 400 }
      );
    }

    const result = await prisma.preference.deleteMany({
      where: {
        id,
        preferenceGroup: { propertyModuleId: propertyModule.id },
      },
    });
    if (result.count === 0) {
      return NextResponse.json(
        { success: false, error: "Preference not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "DELETE");
  }
}
