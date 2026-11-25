import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

// ======================================================
// GET ACCOUNT TYPES
// ======================================================

export async function GET(req: NextRequest) {
  try {
    // -----------------------------------------------
    // 1. Get client token
    // -----------------------------------------------

    const token =
      req.cookies.get("client-token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    // -----------------------------------------------
    // 2. Verify token
    // -----------------------------------------------

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired session",
        },
        { status: 401 }
      );
    }

    // -----------------------------------------------
    // 3. Check client role
    // -----------------------------------------------

    if (
      decoded.role !== "CLIENT" &&
      decoded.role !== "PROPERTY_ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid client session",
        },
        { status: 403 }
      );
    }

    // -----------------------------------------------
    // 4. Get user ID
    // -----------------------------------------------

    const userId = Number(decoded.id);

    if (!Number.isInteger(userId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user ID",
        },
        { status: 401 }
      );
    }

    // -----------------------------------------------
    // 5. Get user's property
    // -----------------------------------------------

    const user =
      await prisma.propertyUsers.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          propertyId: true,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    // -----------------------------------------------
    // 6. Find FOM module
    // -----------------------------------------------

    const fomModule =
      await prisma.module.findUnique({
        where: {
          code: "fom",
        },
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
        },
      });

    if (!fomModule) {
      return NextResponse.json(
        {
          success: false,
          error: "FOM module not found",
        },
        { status: 404 }
      );
    }

    if (!fomModule.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "FOM module is inactive",
        },
        { status: 403 }
      );
    }

    // -----------------------------------------------
    // 7. Find PropertyModule
    // -----------------------------------------------

    const propertyModule =
      await prisma.propertyModule.findUnique({
        where: {
          propertyId_moduleId: {
            propertyId: user.propertyId,
            moduleId: fomModule.id,
          },
        },
        select: {
          id: true,
          propertyId: true,
          moduleId: true,
        },
      });

    if (!propertyModule) {
      return NextResponse.json(
        {
          success: false,
          error:
            "FOM module is not assigned to this property",
        },
        { status: 403 }
      );
    }

    // -----------------------------------------------
    // 8. Get Account Types
    // -----------------------------------------------

    const accountTypes =
      await prisma.accountType.findMany({
        where: {
          propertyModuleId:
            propertyModule.id,
        },
        orderBy: {
          sortOrder: "asc",
        },
      });

    // -----------------------------------------------
    // 9. Response
    // -----------------------------------------------

    return NextResponse.json({
      success: true,

      module: {
        id: fomModule.id,
        code: fomModule.code,
        name: fomModule.name,
      },

      propertyModuleId:
        propertyModule.id,

      accountTypes,
    });
  } catch (error) {
    console.error(
      "GET ACCOUNT TYPES ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to load account types",
      },
      { status: 500 }
    );
  }
}


// ======================================================
// POST / SAVE ACCOUNT TYPES
// ======================================================

export async function POST(
  req: NextRequest
) {
  try {
    // -----------------------------------------------
    // 1. Get client token
    // -----------------------------------------------

    const token =
      req.cookies.get("client-token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    // -----------------------------------------------
    // 2. Verify token
    // -----------------------------------------------

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired session",
        },
        { status: 401 }
      );
    }

    // -----------------------------------------------
    // 3. Check role
    // -----------------------------------------------

    if (
      decoded.role !== "CLIENT" &&
      decoded.role !== "PROPERTY_ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid client session",
        },
        { status: 403 }
      );
    }

    // -----------------------------------------------
    // 4. Get user
    // -----------------------------------------------

    const userId = Number(decoded.id);

    if (!Number.isInteger(userId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user ID",
        },
        { status: 401 }
      );
    }

    const user =
      await prisma.propertyUsers.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          propertyId: true,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    // -----------------------------------------------
    // 5. Find FOM module
    // -----------------------------------------------

    const fomModule =
      await prisma.module.findUnique({
        where: {
          code: "fom",
        },
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
        },
      });

    if (!fomModule) {
      return NextResponse.json(
        {
          success: false,
          error: "FOM module not found",
        },
        { status: 404 }
      );
    }

    if (!fomModule.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "FOM module is inactive",
        },
        { status: 403 }
      );
    }

    // -----------------------------------------------
    // 6. Find PropertyModule
    // -----------------------------------------------

    const propertyModule =
      await prisma.propertyModule.findUnique({
        where: {
          propertyId_moduleId: {
            propertyId: user.propertyId,
            moduleId: fomModule.id,
          },
        },
        select: {
          id: true,
          propertyId: true,
          moduleId: true,
        },
      });

    if (!propertyModule) {
      return NextResponse.json(
        {
          success: false,
          error:
            "FOM module is not assigned to this property",
        },
        { status: 403 }
      );
    }

    // -----------------------------------------------
    // 7. Read request
    // -----------------------------------------------

    const body = await req.json();

    const rows = body?.rows;

    if (!Array.isArray(rows)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid account type data",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------------
    // 8. Validate rows
    // -----------------------------------------------

    if (
      rows.some(
        (row: unknown) =>
          row === null || typeof row !== "object" || Array.isArray(row)
      )
    ) {
      return NextResponse.json(
        { success: false, error: "Each account type row must be an object." },
        { status: 400 }
      );
    }

    const cleanedRows = (rows as Record<string, unknown>[]).map((row, index) => ({
      id: Number.isInteger(Number(row.id)) ? Number(row.id) : null,
      code: String(row.code ?? "").trim(),
      name: String(row.name ?? "").trim(),
      isDefault: row.isDefault === true || row.isDefault === "Yes",
      sortOrder: index,
    }));

    const codeSet = new Set<string>();
    const nameSet = new Set<string>();
    const idSet = new Set<number>();

    for (const row of cleanedRows) {
      if (!row.code || !row.name) {
        return NextResponse.json(
          { success: false, error: "Code and name are required" },
          { status: 400 }
        );
      }

      if (row.code.length > 8) {
        return NextResponse.json(
          { success: false, error: "Account type code cannot exceed 8 characters." },
          { status: 400 }
        );
      }

      if (row.name.length < 2) {
        return NextResponse.json(
          { success: false, error: "Account type name must be at least 2 characters." },
          { status: 400 }
        );
      }

      const code = row.code.toLowerCase();
      const name = row.name.toLowerCase();

      if (codeSet.has(code)) {
        return NextResponse.json(
          { success: false, error: `Duplicate account type code: ${row.code}` },
          { status: 409 }
        );
      }
      if (nameSet.has(name)) {
        return NextResponse.json(
          { success: false, error: `Duplicate account type name: ${row.name}` },
          { status: 409 }
        );
      }
      codeSet.add(code);
      nameSet.add(name);

      if (row.id && row.id > 0) {
        if (idSet.has(row.id)) {
          return NextResponse.json(
            { success: false, error: "Duplicate account type row ID" },
            { status: 400 }
          );
        }
        idSet.add(row.id);
      }
    }

    if (cleanedRows.filter((row) => row.isDefault).length > 1) {
      return NextResponse.json(
        { success: false, error: "Only one account type can be default" },
        { status: 400 }
      );
    }

    const existingRows = await prisma.accountType.findMany({
      where: { propertyModuleId: propertyModule.id },
      select: { id: true },
    });
    const existingIds = new Set(existingRows.map((row) => row.id));
    const incomingIds = new Set(
      cleanedRows.flatMap((row) =>
        row.id && row.id > 0 ? [row.id] : []
      )
    );

    if (cleanedRows.some((row) => row.id && row.id > 0 && !existingIds.has(row.id))) {
      return NextResponse.json(
        { success: false, error: "An account type row does not belong to this property." },
        { status: 404 }
      );
    }

    const existingCodes = await prisma.accountType.findMany({
      where: { propertyModuleId: propertyModule.id },
      select: { id: true, code: true },
    });

    for (const row of cleanedRows) {
      const duplicate = existingCodes.find(
        (existing) =>
          existing.code.toLowerCase() === row.code.toLowerCase() &&
          existing.id !== row.id &&
          !incomingIds.has(existing.id)
      );

      if (duplicate) {
        return NextResponse.json(
          { success: false, error: `Account type code "${row.code}" already exists.` },
          { status: 409 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const row of cleanedRows) {
        const data = {
          code: row.code,
          name: row.name,
          isDefault: row.isDefault,
          isActive: true,
          sortOrder: row.sortOrder,
        };

        if (row.id && existingIds.has(row.id)) {
          await tx.accountType.update({
            where: { id: row.id },
            data,
          });
        } else {
          await tx.accountType.create({
            data: {
              ...data,
              propertyModuleId: propertyModule.id,
            },
          });
        }
      }
    });

    const accountTypes = await prisma.accountType.findMany({
      where: { propertyModuleId: propertyModule.id },
      orderBy: { sortOrder: "asc" },
    });

    // -----------------------------------------------
    // 12. Response
    // -----------------------------------------------

    return NextResponse.json({
      success: true,

      message:
        "Account types saved successfully",

      propertyModuleId:
        propertyModule.id,

      accountTypes,
    });
  } catch (error) {
    console.error(
      "SAVE ACCOUNT TYPES ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to save account types",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get("client-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !["CLIENT", "PROPERTY_ADMIN"].includes(decoded.role)) {
      return NextResponse.json({ error: "Invalid client session" }, { status: 403 });
    }

    const user = await prisma.propertyUsers.findUnique({
      where: { id: Number(decoded.id) },
      select: { propertyId: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const fomModule = await prisma.module.findUnique({ where: { code: "fom" } });
    const propertyModule = fomModule
      ? await prisma.propertyModule.findUnique({
          where: {
            propertyId_moduleId: {
              propertyId: user.propertyId,
              moduleId: fomModule.id,
            },
          },
        })
      : null;

    if (!propertyModule) {
      return NextResponse.json(
        { error: "FOM module is not assigned to this property." },
        { status: 403 }
      );
    }

    if (req.nextUrl.searchParams.get("all") === "true") {
      const subAccountCount = await prisma.subAccountType.count({
        where: {
          accountType: {
            propertyModuleId: propertyModule.id,
          },
        },
      });

      if (subAccountCount > 0) {
        return NextResponse.json(
          { error: "Delete all sub account types first." },
          { status: 409 }
        );
      }

      const result = await prisma.accountType.deleteMany({
        where: { propertyModuleId: propertyModule.id },
      });

      return NextResponse.json({ success: true, count: result.count });
    }

    if (!req.nextUrl.searchParams.has("id")) {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return NextResponse.json(
          { error: "Request body must be valid JSON." },
          { status: 400 }
        );
      }

      if (
        typeof body !== "object" ||
        body === null ||
        !("ids" in body) ||
        !Array.isArray(body.ids)
      ) {
        return NextResponse.json(
          { error: "Provide account type IDs to delete." },
          { status: 400 }
        );
      }

      const ids = body.ids.map(Number);
      if (
        ids.length === 0 ||
        ids.some((id) => !Number.isInteger(id) || id <= 0) ||
        new Set(ids).size !== ids.length
      ) {
        return NextResponse.json(
          { error: "Select valid account type rows to delete." },
          { status: 400 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const accountTypes = await tx.accountType.findMany({
          where: {
            id: { in: ids },
            propertyModuleId: propertyModule.id,
          },
          select: { id: true },
        });

        if (accountTypes.length !== ids.length) {
          return {
            error: "One or more account types do not belong to this property.",
            status: 404,
          };
        }

        const subAccountCount = await tx.subAccountType.count({
          where: { accountTypeId: { in: ids } },
        });
        if (subAccountCount > 0) {
          return {
            error: "Delete the selected account types' sub account types first.",
            status: 409,
          };
        }

        const deleted = await tx.accountType.deleteMany({
          where: {
            id: { in: ids },
            propertyModuleId: propertyModule.id,
          },
        });
        return { count: deleted.count };
      });

      if ("error" in result) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
      }
      return NextResponse.json({
        success: true,
        count: result.count,
        message: `${result.count} account type row(s) deleted.`,
      });
    }

    const id = Number(req.nextUrl.searchParams.get("id"));

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid account type row." }, { status: 400 });
    }

    const accountType = await prisma.accountType.findFirst({
      where: { id, propertyModuleId: propertyModule.id },
      select: { id: true },
    });
    if (!accountType) {
      return NextResponse.json({ error: "Account type not found." }, { status: 404 });
    }

    const subAccountCount = await prisma.subAccountType.count({
      where: { accountTypeId: id },
    });
    if (subAccountCount > 0) {
      return NextResponse.json(
        { error: "Delete this account type's sub account types first." },
        { status: 409 }
      );
    }

    await prisma.accountType.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE ACCOUNT TYPE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to delete account type." },
      { status: 500 }
    );
  }
}