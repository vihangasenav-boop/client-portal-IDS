import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Get authenticated user + FOM PropertyModule
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
 * GET Business Sources
 */
export async function GET(req: NextRequest) {
  try {
    const { propertyModule } =
      await getFomPropertyModule(req);

    const businessSources =
      await prisma.businessSource.findMany({
        where: {
          businessSourceGroup: {
            propertyModuleId: propertyModule.id,
          },
        },
        include: {
          businessSourceGroup: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
        orderBy: [
          {
            displaySequence: "asc",
          },
          {
            id: "asc",
          },
        ],
      });

    return NextResponse.json({
      success: true,
      propertyModuleId: propertyModule.id,
      businessSources,
    });
  } catch (error) {
    console.error(
      "GET BUSINESS SOURCES ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load business sources";

    const status =
      message === "Not authenticated" ||
      message === "Invalid or expired session"
        ? 401
        : message === "Invalid client session"
          ? 403
          : 500;

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
 * POST Business Sources
 */
export async function DELETE(req: NextRequest) {
  try {
    const { propertyModule } = await getFomPropertyModule(req);
    if (req.nextUrl.searchParams.get("all") === "true") {
      const result = await prisma.businessSource.deleteMany({
        where: { businessSourceGroup: { propertyModuleId: propertyModule.id } },
      });
      return NextResponse.json({ success: true, count: result.count });
    }
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "Invalid business source row." }, { status: 400 });
    }
    const result = await prisma.businessSource.deleteMany({
      where: { id, businessSourceGroup: { propertyModuleId: propertyModule.id } },
    });
    if (result.count === 0) {
      return NextResponse.json({ success: false, error: "Business source not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE BUSINESS SOURCE ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to delete business source.";
    const status =
      message === "Not authenticated" || message === "Invalid or expired session"
        ? 401
        : message === "Invalid client session"
          ? 403
          : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
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
          { success: false, error: "Each business source row must be an object." },
          { status: 400 }
        );
      }
      const rows = (body.rows as Record<string, unknown>[]).map((row) => ({
        id: Number.isInteger(Number(row.id)) && Number(row.id) > 0 ? Number(row.id) : null,
        code: String(row.code ?? "").trim(),
        name: String(row.name ?? "").trim(),
        businessSourceGroupId: Number(row.businessSourceGroupId),
        displaySequence: Number(row.displaySequence ?? 0),
      }));
      const groups = await prisma.businessSourceGroup.findMany({
        where: { propertyModuleId: propertyModule.id, isActive: true },
        select: { id: true },
      });
      const groupIds = new Set(groups.map((group) => group.id));
      if (rows.some((row) =>
        !row.code ||
        !row.name ||
        !Number.isInteger(row.businessSourceGroupId) ||
        !groupIds.has(row.businessSourceGroupId) ||
        !Number.isInteger(row.displaySequence) ||
        row.displaySequence < 0
      )) {
        return NextResponse.json(
          { success: false, error: "Business source rows contain invalid group, code, name, or display sequence values." },
          { status: 400 }
        );
      }
      const existingRows = await prisma.businessSource.findMany({
        where: { businessSourceGroup: { propertyModuleId: propertyModule.id } },
        select: { id: true, code: true, businessSourceGroupId: true },
      });
      const existingIds = new Set(existingRows.map((row) => row.id));
      const incomingIds = new Set(rows.flatMap((row) => row.id ? [row.id] : []));
      if (
        incomingIds.size !== rows.filter((row) => row.id).length ||
        rows.some((row) => row.id && !existingIds.has(row.id))
      ) {
        return NextResponse.json(
          { success: false, error: "A business source row does not belong to this property." },
          { status: 404 }
        );
      }
      const codes = new Set<string>();
      for (const row of rows) {
        const key = `${row.businessSourceGroupId}:${row.code.toLowerCase()}`;
        if (codes.has(key)) {
          return NextResponse.json(
            { success: false, error: "Business source codes must be unique within each group." },
            { status: 409 }
          );
        }
        codes.add(key);
        if (existingRows.some((existing) =>
          existing.id !== row.id &&
          !incomingIds.has(existing.id) &&
          existing.businessSourceGroupId === row.businessSourceGroupId &&
          existing.code.toLowerCase() === row.code.toLowerCase()
        )) {
          return NextResponse.json(
            { success: false, error: `Business source code "${row.code}" already exists in this group.` },
            { status: 409 }
          );
        }
      }
      await prisma.$transaction(async (tx) => {
        for (const row of rows) {
          const data = {
            code: row.code,
            name: row.name,
            businessSourceGroupId: row.businessSourceGroupId,
            displaySequence: row.displaySequence,
          };
          if (row.id) {
            await tx.businessSource.update({ where: { id: row.id }, data });
          } else {
            await tx.businessSource.create({ data });
          }
        }
      });
      const businessSources = await prisma.businessSource.findMany({
        where: { businessSourceGroup: { propertyModuleId: propertyModule.id } },
        orderBy: [{ displaySequence: "asc" }, { id: "asc" }],
      });
      return NextResponse.json({ success: true, businessSources });
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
          error: "At least one row is required",
        },
        { status: 400 }
      );
    }

    /**
     * Get Business Source Groups
     * belonging to this property's FOM.
     */
    const groups =
      await prisma.businessSourceGroup.findMany({
        where: {
          propertyModuleId: propertyModule.id,
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      });

    if (groups.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please create Business Source Groups before creating Business Sources.",
        },
        { status: 400 }
      );
    }

    const groupIds = new Set(
      groups.map((group) => String(group.id))
    );

    const errors: {
      index: number;
      error: string;
    }[] = [];

    const codeSet = new Set<string>();

    /**
     * Validate rows
     */
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

      const businessSourceGroupId =
        String(
          row.businessSourceGroupId ?? ""
        ).trim();

      const displaySequence =
        Number(
          row.displaySequence ?? 0
        );

      if (!code) {
        errors.push({
          index,
          error: "Code is required",
        });
        continue;
      }

      if (!name) {
        errors.push({
          index,
          error: "Name is required",
        });
        continue;
      }

      if (!businessSourceGroupId) {
        errors.push({
          index,
          error:
            "Business Source Group is required",
        });
        continue;
      }

      /**
       * Verify group belongs to
       * this property's FOM module.
       */
      if (
        !groupIds.has(
          businessSourceGroupId
        )
      ) {
        errors.push({
          index,
          error:
            "Invalid Business Source Group",
        });
        continue;
      }

      if (
        !Number.isInteger(displaySequence) ||
        displaySequence < 0
      ) {
        errors.push({
          index,
          error:
            "Display Sequence must be a valid number",
        });
        continue;
      }

      const normalizedCode =
        code.toLowerCase();

      if (codeSet.has(normalizedCode)) {
        errors.push({
          index,
          error:
            "Duplicate Business Source code",
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
     * Check existing codes.
     *
     * Because code uniqueness is inside
     * BusinessSourceGroup, we check
     * group + code together.
     */
    for (const row of body.rows) {
      const code = String(
        row.code
      ).trim();

      const groupId = Number(
        row.businessSourceGroupId
      );

      const existing =
        await prisma.businessSource.findFirst({
          where: {
            businessSourceGroupId: groupId,
            code,
          },
          select: {
            id: true,
            code: true,
          },
        });

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Business Source code "${code}" already exists in the selected group.`,
          },
          { status: 409 }
        );
      }
    }

    /**
     * Create records
     */
    await prisma.businessSource.createMany({
      data: body.rows.map((row: any) => ({
        businessSourceGroupId:
          Number(
            row.businessSourceGroupId
          ),

        code: String(
          row.code
        ).trim(),

        name: String(
          row.name
        ).trim(),

        displaySequence:
          Number(
            row.displaySequence ?? 0
          ),
      })),
    });

    /**
     * Return saved records
     */
    const businessSources =
      await prisma.businessSource.findMany({
        where: {
          businessSourceGroup: {
            propertyModuleId:
              propertyModule.id,
          },
        },
        include: {
          businessSourceGroup: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
        orderBy: [
          {
            displaySequence: "asc",
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
          "Business sources saved successfully",
        propertyModuleId:
          propertyModule.id,
        businessSources,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE BUSINESS SOURCES ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to save business sources";

    const status =
      message === "Not authenticated"
        ? 401
        : message === "Invalid or expired session"
          ? 401
          : message === "Invalid client session"
            ? 403
            : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}