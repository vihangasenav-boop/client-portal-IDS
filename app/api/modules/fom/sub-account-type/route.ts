import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Get authenticated user's FOM PropertyModule
 */
async function getFomPropertyModule(req: NextRequest) {
  const token = req.cookies.get("client-token")?.value;

  if (!token) {
    throw new Error("Not authenticated");
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    throw new Error("Invalid or expired session");
  }

  if (
    decoded.role !== "CLIENT" &&
    decoded.role !== "PROPERTY_ADMIN"
  ) {
    throw new Error("Invalid client session");
  }

  const userId = Number(decoded.id);

  if (!Number.isInteger(userId)) {
    throw new Error("Invalid user ID");
  }

  /**
   * Get logged-in user
   */
  const user = await prisma.propertyUsers.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      propertyId: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  /**
   * Get FOM module assigned to this property
   */
  const propertyModule =
    await prisma.propertyModule.findFirst({
      where: {
        propertyId: user.propertyId,

        module: {
          code: "FOM",
          isActive: true,
        },
      },

      select: {
        id: true,
        propertyId: true,
        moduleId: true,
      },
    });

  if (!propertyModule) {
    throw new Error("Property module not found");
  }

  return {
    user,
    propertyModule,
  };
}

/**
 * GET
 *
 * Get Sub Account Types for the
 * logged-in property's FOM module.
 *
 * Also returns Account Types for
 * the dropdown.
 */
export async function GET(req: NextRequest) {
  try {
    const { propertyModule } =
      await getFomPropertyModule(req);

    /**
     * Get Account Types belonging
     * to this FOM PropertyModule.
     */
    const accountTypes =
      await prisma.accountType.findMany({
        where: {
          propertyModuleId: propertyModule.id,
          isActive: true,
        },

        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            id: "asc",
          },
        ],

        select: {
          id: true,
          code: true,
          name: true,
          isDefault: true,
        },
      });

    /**
     * Get Sub Account Types through
     * AccountType relationship.
     */
    const subAccountTypes =
      await prisma.subAccountType.findMany({
        where: {
          accountType: {
            propertyModuleId: propertyModule.id,
          },
        },

        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            id: "asc",
          },
        ],

        include: {
          accountType: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,

      propertyModuleId:
        propertyModule.id,

      accountTypes,

      subAccountTypes,
    });
  } catch (error) {
    console.error(
      "GET SUB ACCOUNT TYPES ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load sub account types";

    let status = 500;

    if (
      message === "Not authenticated" ||
      message === "Invalid or expired session"
    ) {
      status = 401;
    }

    if (
      message === "Invalid client session"
    ) {
      status = 403;
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}

/**
 * POST
 *
 * Create Sub Account Types.
 */
export async function POST(req: NextRequest) {
  try {
    const { propertyModule } =
      await getFomPropertyModule(req);

    const body = await req.json();

    if (!Array.isArray(body.rows)) {
      return NextResponse.json(
        {
          success: false,
          error: "Rows must be an array",
        },
        { status: 400 }
      );
    }

    /**
     * Get valid Account Types for
     * this property's FOM module.
     */
    const accountTypes =
      await prisma.accountType.findMany({
        where: {
          propertyModuleId:
            propertyModule.id,

          isActive: true,
        },

        select: {
          id: true,
          code: true,
          name: true,
        },
      });

    if (accountTypes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please create Account Types before creating Sub Account Types.",
        },
        { status: 400 }
      );
    }

    /**
     * Create AccountType lookup.
     */
    const accountTypeMap = new Map(
      accountTypes.map((accountType) => [
        accountType.id,
        accountType,
      ])
    );

    /**
     * Validation errors
     */
    const errors: {
      index: number;
      error: string;
    }[] = [];

    /**
     * Detect duplicate code under
     * the same Account Type.
     *
     * Example:
     *
     * Account Type: ROOM
     *   001
     *   002
     *
     * Account Type: FOOD
     *   001
     *
     * This is allowed because the unique
     * constraint is:
     *
     * @@unique([accountTypeId, code])
     */
    if (
      body.rows.some(
        (row: unknown) =>
          row === null || typeof row !== "object" || Array.isArray(row)
      )
    ) {
      return NextResponse.json(
        { success: false, error: "Each sub account type row must be an object." },
        { status: 400 }
      );
    }

    const cleanedRows = (body.rows as Record<string, unknown>[]).map((row, index) => ({
      id: Number.isInteger(Number(row.id)) ? Number(row.id) : null,
      accountTypeId: Number(row.accountTypeId),
      code: String(row.code ?? "").trim(),
      name: String(row.name ?? "").trim(),
      isDefault: row.isDefault === true || row.isDefault === "Yes",
      sortOrder: index,
    }));

    const duplicateMap =
      new Map<string, number>();
    const defaultByAccountType =
      new Set<number>();

    for (
      let index = 0;
      index < cleanedRows.length;
      index++
    ) {
      const row = cleanedRows[index];
      const { code, name, accountTypeId } = row;

      /**
       * Code validation
       */
      if (!code) {
        errors.push({
          index,
          error: "Code is required",
        });

        continue;
      }

      /**
       * Name validation
       */
      if (!name) {
        errors.push({
          index,
          error: "Name is required",
        });

        continue;
      }

      /**
       * Account Type validation
       */
      if (!Number.isInteger(accountTypeId)) {
        errors.push({
          index,
          error: "Account Type is required",
        });

        continue;
      }

      /**
       * Make sure AccountType belongs
       * to this property's FOM module.
       */
      if (!accountTypeMap.has(accountTypeId)) {
        errors.push({
          index,
          error:
            "Invalid Account Type for this property module",
        });

        continue;
      }

      /**
       * Duplicate code inside request
       */
      const duplicateKey =
        `${accountTypeId}:${code.toLowerCase()}`;

      if (
        duplicateMap.has(duplicateKey)
      ) {
        errors.push({
          index,
          error:
            "Duplicate Sub Account Type code for this Account Type",
        });

        continue;
      }

      duplicateMap.set(
        duplicateKey,
        index
      );

      if (row.isDefault) {
        if (defaultByAccountType.has(accountTypeId)) {
          errors.push({
            index,
            error: "Only one sub account type can be default per account type",
          });
          continue;
        }
        defaultByAccountType.add(accountTypeId);
      }
    }

    /**
     * Stop if validation errors exist.
     */
    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          errors,
        },
        { status: 400 }
      );
    }

    /**
     * Check existing records.
     *
     * Because the unique key is:
     *
     * [accountTypeId, code]
     *
     * we need to check each pair.
     */
    const existingRows = await prisma.subAccountType.findMany({
      where: {
        accountType: {
          propertyModuleId: propertyModule.id,
        },
      },
      select: {
        id: true,
        code: true,
        accountTypeId: true,
      },
    });
    const existingById = new Map(
      existingRows.map((row) => [row.id, row])
    );
    const incomingIds = new Set(
      cleanedRows.flatMap((row) =>
        row.id && row.id > 0 ? [row.id] : []
      )
    );

    for (const row of cleanedRows) {
      if (row.id && row.id > 0 && !existingById.has(row.id)) {
        return NextResponse.json(
          {
            success: false,
            error: "A sub account type row does not belong to this property.",
          },
          { status: 404 }
        );
      }

      const duplicate = existingRows.find(
        (existing) =>
          existing.accountTypeId === row.accountTypeId &&
          existing.code.toLowerCase() === row.code.toLowerCase() &&
          existing.id !== row.id &&
          !incomingIds.has(existing.id)
      );

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Sub Account Type code "${row.code}" already exists for the selected Account Type.`,
          },
          { status: 409 }
        );
      }
    }

    /**
     * Create Sub Account Types
     */
    await prisma.$transaction(async (tx) => {
      for (const row of cleanedRows) {
        const data = {
          accountTypeId: row.accountTypeId,
          code: row.code,
          name: row.name,
          isDefault: row.isDefault,
          isActive: true,
          sortOrder: row.sortOrder,
        };

        if (row.id && existingById.has(row.id)) {
          await tx.subAccountType.update({
            where: { id: row.id },
            data,
          });
        } else {
          await tx.subAccountType.create({ data });
        }
      }
    });

    /**
     * Return all Sub Account Types
     * belonging to this FOM module.
     */
    const subAccountTypes =
      await prisma.subAccountType.findMany({
        where: {
          accountType: {
            propertyModuleId:
              propertyModule.id,
          },
        },

        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            id: "asc",
          },
        ],

        include: {
          accountType: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

    return NextResponse.json(
      {
        success: true,

        message:
          "Sub account types saved successfully",

        propertyModuleId:
          propertyModule.id,

        subAccountTypes,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE SUB ACCOUNT TYPES ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to save sub account types";

    let status = 500;

    if (
      message === "Not authenticated" ||
      message === "Invalid or expired session"
    ) {
      status = 401;
    }

    if (
      message === "Invalid client session"
    ) {
      status = 403;
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { propertyModule } = await getFomPropertyModule(req);

    if (req.nextUrl.searchParams.get("all") === "true") {
      const result = await prisma.subAccountType.deleteMany({
        where: {
          accountType: {
            propertyModuleId: propertyModule.id,
          },
        },
      });

      return NextResponse.json({ success: true, count: result.count });
    }

    const id = Number(req.nextUrl.searchParams.get("id"));

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid sub account type row." },
        { status: 400 }
      );
    }

    const row = await prisma.subAccountType.findFirst({
      where: {
        id,
        accountType: {
          propertyModuleId: propertyModule.id,
        },
      },
      select: { id: true },
    });

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Sub account type not found." },
        { status: 404 }
      );
    }

    await prisma.subAccountType.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE SUB ACCOUNT TYPE ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to delete sub account type";
    const status =
      message === "Not authenticated" ||
      message === "Invalid or expired session"
        ? 401
        : message === "Invalid client session"
          ? 403
          : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}