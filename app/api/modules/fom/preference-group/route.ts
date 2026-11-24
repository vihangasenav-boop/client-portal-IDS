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
  console.error(`${operation} PREFERENCE GROUPS ERROR:`, error);
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
    const preferenceGroups = await prisma.preferenceGroups.findMany({
      where: { propertyModuleId: propertyModule.id },
      orderBy: [{ id: "asc" }],
    });

    return NextResponse.json({
      success: true,
      propertyModuleId: propertyModule.id,
      preferenceGroups,
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
        { success: false, error: "Add at least one preference group." },
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
        { success: false, error: "Each preference group row must be an object." },
        { status: 400 }
      );
    }

    const rows = (body.rows as Record<string, unknown>[]).map((row) => {
      const rawId = Number(row.id);
      return {
        id: Number.isInteger(rawId) && rawId > 0 ? rawId : null,
        hasInvalidId: rawId > 0 && !Number.isInteger(rawId),
        code: String(row.code ?? "").trim(),
        name: String(row.name ?? "").trim(),
      };
    });
    if (rows.some((row) => row.hasInvalidId || !row.code || !row.name)) {
      return NextResponse.json(
        { success: false, error: "Each preference group needs a valid code and name." },
        { status: 400 }
      );
    }

    const ids = rows.flatMap((row) => row.id ? [row.id] : []);
    if (new Set(ids).size !== ids.length) {
      return NextResponse.json(
        { success: false, error: "Duplicate preference group row ID." },
        { status: 400 }
      );
    }

    const codes = new Set<string>();
    const names = new Set<string>();
    for (const row of rows) {
      const code = row.code.toLowerCase();
      const name = row.name.toLowerCase();
      if (codes.has(code) || names.has(name)) {
        return NextResponse.json(
          { success: false, error: "Preference group codes and names must be unique." },
          { status: 409 }
        );
      }
      codes.add(code);
      names.add(name);
    }

    const existingRows = await prisma.preferenceGroups.findMany({
      where: { propertyModuleId: propertyModule.id },
      select: { id: true, code: true, name: true },
    });
    const existingIds = new Set(existingRows.map((row) => row.id));
    const incomingIds = new Set(ids);
    if (rows.some((row) => row.id && !existingIds.has(row.id))) {
      return NextResponse.json(
        { success: false, error: "A preference group does not belong to this property." },
        { status: 404 }
      );
    }

    for (const row of rows) {
      const duplicate = existingRows.find(
        (existing) =>
          existing.id !== row.id &&
          !incomingIds.has(existing.id) &&
          (existing.code.toLowerCase() === row.code.toLowerCase() ||
            existing.name.toLowerCase() === row.name.toLowerCase())
      );
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: `Preference group code or name "${row.code}" already exists.` },
          { status: 409 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const data = { code: row.code, name: row.name };
        if (row.id) {
          await tx.preferenceGroups.update({ where: { id: row.id }, data });
        } else {
          await tx.preferenceGroups.create({
            data: { ...data, propertyModuleId: propertyModule.id },
          });
        }
      }
    });

    const preferenceGroups = await prisma.preferenceGroups.findMany({
      where: { propertyModuleId: propertyModule.id },
      orderBy: [{ id: "asc" }],
    });
    return NextResponse.json({
      success: true,
      propertyModuleId: propertyModule.id,
      preferenceGroups,
    });
  } catch (error) {
    return errorResponse(error, "SAVE");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const propertyModule = await getFomPropertyModule(req);
    if (req.nextUrl.searchParams.get("all") === "true") {
      const preferenceCount = await prisma.preference.count({
        where: { preferenceGroup: { propertyModuleId: propertyModule.id } },
      });
      if (preferenceCount > 0) {
        return NextResponse.json(
          { success: false, error: "Delete all preferences before deleting preference groups." },
          { status: 409 }
        );
      }

      const result = await prisma.preferenceGroups.deleteMany({
        where: { propertyModuleId: propertyModule.id },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid preference group row." },
        { status: 400 }
      );
    }

    const group = await prisma.preferenceGroups.findFirst({
      where: { id, propertyModuleId: propertyModule.id },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json(
        { success: false, error: "Preference group not found." },
        { status: 404 }
      );
    }

    const preferenceCount = await prisma.preference.count({
      where: { preferenceGroupId: id },
    });
    if (preferenceCount > 0) {
      return NextResponse.json(
        { success: false, error: "Delete this group's preferences before deleting it." },
        { status: 409 }
      );
    }

    await prisma.preferenceGroups.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "DELETE");
  }
}
