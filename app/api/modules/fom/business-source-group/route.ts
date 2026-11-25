import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Get authenticated user's FOM PropertyModule
 */
async function getFomPropertyModule(
  req: NextRequest
) {
  const token =
    req.cookies.get("client-token")?.value;

  if (!token) {
    throw new Error("Not authenticated");
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    throw new Error(
      "Invalid or expired session"
    );
  }

  if (
    decoded.role !== "CLIENT" &&
    decoded.role !== "PROPERTY_ADMIN"
  ) {
    throw new Error(
      "Invalid client session"
    );
  }

  const userId = Number(decoded.id);

  if (!Number.isInteger(userId)) {
    throw new Error("Invalid user ID");
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
    throw new Error("User not found");
  }

  /**
   * Find FOM module assigned to property
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
    throw new Error(
      "Property module not found"
    );
  }

  return {
    user,
    propertyModule,
  };
}

/**
 * GET
 *
 * Get Business Source Groups
 */
export async function GET(
  req: NextRequest
) {
  try {
    const { propertyModule } =
      await getFomPropertyModule(req);

    const businessSourceGroups =
      await prisma.businessSourceGroup.findMany({
        where: {
          propertyModuleId:
            propertyModule.id,
        },

        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            id: "asc",
          },
        ],
      });

    return NextResponse.json({
      success: true,

      propertyModuleId:
        propertyModule.id,

      businessSourceGroups,
    });
  } catch (error) {
    console.error(
      "GET BUSINESS SOURCE GROUPS ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load business source groups";

    let status = 500;

    if (
      message === "Not authenticated" ||
      message ===
        "Invalid or expired session"
    ) {
      status = 401;
    }

    if (
      message ===
      "Invalid client session"
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
 * Create Business Source Groups
 */
export async function POST(
  req: NextRequest
) {
  try {
    const { propertyModule } =
      await getFomPropertyModule(req);

    const body = await req.json();

    if (
      Array.isArray(body?.rows) &&
      body.rows.some(
        (row: unknown) =>
          row !== null &&
          typeof row === "object" &&
          !Array.isArray(row) &&
          Number((row as Record<string, unknown>).id) > 0
      )
    ) {
      if (body.rows.some((row: unknown) => row === null || typeof row !== "object" || Array.isArray(row))) {
        return NextResponse.json(
          { success: false, error: "Each business source group row must be an object." },
          { status: 400 }
        );
      }
      const rows = (body.rows as Record<string, unknown>[]).map((row, index) => ({
        id: Number.isInteger(Number(row.id)) && Number(row.id) > 0 ? Number(row.id) : null,
        code: String(row.code ?? "").trim(),
        name: String(row.name ?? "").trim(),
        sortOrder: index,
      }));
      if (rows.some((row) => !row.code || !row.name)) {
        return NextResponse.json(
          { success: false, error: "Business source group code and name are required." },
          { status: 400 }
        );
      }
      const existingRows = await prisma.businessSourceGroup.findMany({
        where: { propertyModuleId: propertyModule.id },
        select: { id: true, code: true, name: true },
      });
      const existingIds = new Set(existingRows.map((row) => row.id));
      const incomingIds = new Set(rows.flatMap((row) => row.id ? [row.id] : []));
      if (
        incomingIds.size !== rows.filter((row) => row.id).length ||
        rows.some((row) => row.id && !existingIds.has(row.id))
      ) {
        return NextResponse.json(
          { success: false, error: "A business source group row does not belong to this property." },
          { status: 404 }
        );
      }
      const codes = new Set<string>();
      for (const row of rows) {
        const code = row.code.toLowerCase();
        if (codes.has(code)) {
          return NextResponse.json(
            { success: false, error: "Business source group codes must be unique." },
            { status: 409 }
          );
        }
        codes.add(code);
        if (existingRows.some((existing) =>
          existing.id !== row.id &&
          !incomingIds.has(existing.id) &&
          existing.code.toLowerCase() === code
        )) {
          return NextResponse.json(
            { success: false, error: `Business source group code "${row.code}" already exists.` },
            { status: 409 }
          );
        }
      }
      await prisma.$transaction(async (tx) => {
        for (const row of rows) {
          const data = { code: row.code, name: row.name, sortOrder: row.sortOrder, isActive: true };
          if (row.id) {
            await tx.businessSourceGroup.update({ where: { id: row.id }, data });
          } else {
            await tx.businessSourceGroup.create({
              data: { ...data, propertyModuleId: propertyModule.id },
            });
          }
        }
      });
      const businessSourceGroups = await prisma.businessSourceGroup.findMany({
        where: { propertyModuleId: propertyModule.id },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      });
      return NextResponse.json({ success: true, businessSourceGroups });
    }

    if (!Array.isArray(body.rows)) {
      return NextResponse.json(
        {
          success: false,
          error: "Rows must be an array",
        },
        { status: 400 }
      );
    }

    if (body.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "At least one row is required",
        },
        { status: 400 }
      );
    }

    /**
     * Validate rows
     */
    const errors: {
      index: number;
      error: string;
    }[] = [];

    const codeSet = new Set<string>();

    for (
      let index = 0;
      index < body.rows.length;
      index++
    ) {
      const row = body.rows[index];

      const code = String(
        row.code ?? ""
      ).trim();

      const name = String(
        row.name ?? ""
      ).trim();

      if (!code) {
        errors.push({
          index,
          error: "Code is required",
        });

        continue;
      }

      if (code.length > 8) {
        errors.push({ index, error: "Code cannot exceed 8 characters" });
        continue;
      }

      if (!name) {
        errors.push({
          index,
          error: "Name is required",
        });

        continue;
      }

      if (name.length < 2) {
        errors.push({ index, error: "Name must be at least 2 characters" });
        continue;
      }

      const normalizedCode =
        code.toLowerCase();

      if (
        codeSet.has(normalizedCode)
      ) {
        errors.push({
          index,
          error:
            "Duplicate Business Source Group code",
        });

        continue;
      }

      codeSet.add(normalizedCode);
    }

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
     * Check existing codes
     */
    const codes = body.rows.map(
      (row: any) =>
        String(row.code).trim()
    );

    const existing =
      await prisma.businessSourceGroup.findMany(
        {
          where: {
            propertyModuleId:
              propertyModule.id,

            code: {
              in: codes,
            },
          },

          select: {
            id: true,
            code: true,
          },
        }
      );

    if (existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "One or more Business Source Group codes already exist",
          existing,
        },
        { status: 409 }
      );
    }

    /**
     * Create records
     */
    await prisma.businessSourceGroup.createMany(
      {
        data: body.rows.map(
          (
            row: any,
            index: number
          ) => ({
            propertyModuleId:
              propertyModule.id,

            code: String(
              row.code
            ).trim(),

            name: String(
              row.name
            ).trim(),

            sortOrder: Number(
              row.sortOrder ??
                index
            ),
          })
        ),
      }
    );

    /**
     * Return saved records
     */
    const businessSourceGroups =
      await prisma.businessSourceGroup.findMany({
        where: {
          propertyModuleId:
            propertyModule.id,
        },

        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            id: "asc",
          },
        ],
      });

    return NextResponse.json(
      {
        success: true,

        message:
          "Business Source Groups saved successfully",

        propertyModuleId:
          propertyModule.id,

        businessSourceGroups,
      },

      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE BUSINESS SOURCE GROUPS ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to save business source groups";

    let status = 500;

    if (
      message === "Not authenticated" ||
      message ===
        "Invalid or expired session"
    ) {
      status = 401;
    }

    if (
      message ===
      "Invalid client session"
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
      const result = await prisma.businessSourceGroup.deleteMany({
        where: { propertyModuleId: propertyModule.id },
      });
      return NextResponse.json({ success: true, count: result.count });
    }
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "Invalid business source group row." }, { status: 400 });
    }
    const result = await prisma.businessSourceGroup.deleteMany({
      where: { id, propertyModuleId: propertyModule.id },
    });
    if (result.count === 0) {
      return NextResponse.json({ success: false, error: "Business source group not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE BUSINESS SOURCE GROUP ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to delete business source group.";
    const status =
      message === "Not authenticated" || message === "Invalid or expired session"
        ? 401
        : message === "Invalid client session"
          ? 403
          : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}