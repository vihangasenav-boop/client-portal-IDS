import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

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

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
| Load Market Segments + Market Segment Groups
*/
export async function GET(req: NextRequest) {
  try {
    const { propertyModule } =
      await getFomPropertyModule(req);

    const marketSegmentGroups =
      await prisma.marketSegmentGroup.findMany({
        where: {
          propertyModuleId: propertyModule.id,
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          name: true,
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

    const marketSegments =
      await prisma.marketSegment.findMany({
        where: {
          marketSegmentGroup: {
            propertyModuleId: propertyModule.id,
          },
          isActive: true,
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
      marketSegmentGroups,
      marketSegments,
    });
  } catch (error) {
    console.error(
      "GET MARKET SEGMENTS ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load market segments";

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

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
| Create Market Segments
*/
export async function DELETE(req: NextRequest) {
  try {
    const { propertyModule } = await getFomPropertyModule(req);
    if (req.nextUrl.searchParams.get("all") === "true") {
      const result = await prisma.marketSegment.deleteMany({
        where: { marketSegmentGroup: { propertyModuleId: propertyModule.id } },
      });
      return NextResponse.json({ success: true, count: result.count });
    }
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "Invalid market segment row." }, { status: 400 });
    }
    const result = await prisma.marketSegment.deleteMany({
      where: { id, marketSegmentGroup: { propertyModuleId: propertyModule.id } },
    });
    if (result.count === 0) {
      return NextResponse.json({ success: false, error: "Market segment not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE MARKET SEGMENT ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to delete market segment.";
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
          { success: false, error: "Each market segment row must be an object." },
          { status: 400 }
        );
      }
      const rows = (body.rows as Record<string, unknown>[]).map((row) => ({
        id: Number.isInteger(Number(row.id)) && Number(row.id) > 0 ? Number(row.id) : null,
        code: String(row.code ?? "").trim(),
        name: String(row.name ?? "").trim(),
        marketSegmentGroupId: Number(row.marketSegmentGroupId),
        displaySequence: Number(row.displaySequence ?? 0),
      }));
      const groups = await prisma.marketSegmentGroup.findMany({
        where: { propertyModuleId: propertyModule.id, isActive: true },
        select: { id: true },
      });
      const groupIds = new Set(groups.map((group) => group.id));
      if (rows.some((row) =>
        !row.code ||
        !row.name ||
        !Number.isInteger(row.marketSegmentGroupId) ||
        !groupIds.has(row.marketSegmentGroupId) ||
        !Number.isInteger(row.displaySequence) ||
        row.displaySequence < 1
      )) {
        return NextResponse.json(
          { success: false, error: "Market segment rows contain invalid group, code, name, or display sequence values." },
          { status: 400 }
        );
      }
      const existingRows = await prisma.marketSegment.findMany({
        where: { marketSegmentGroup: { propertyModuleId: propertyModule.id } },
        select: { id: true, code: true, marketSegmentGroupId: true },
      });
      const existingIds = new Set(existingRows.map((row) => row.id));
      const incomingIds = new Set(rows.flatMap((row) => row.id ? [row.id] : []));
      if (
        incomingIds.size !== rows.filter((row) => row.id).length ||
        rows.some((row) => row.id && !existingIds.has(row.id))
      ) {
        return NextResponse.json(
          { success: false, error: "A market segment row does not belong to this property." },
          { status: 404 }
        );
      }
      const codes = new Set<string>();
      for (const row of rows) {
        const key = `${row.marketSegmentGroupId}:${row.code.toLowerCase()}`;
        if (codes.has(key)) {
          return NextResponse.json(
            { success: false, error: "Market segment codes must be unique within each group." },
            { status: 409 }
          );
        }
        codes.add(key);
        if (existingRows.some((existing) =>
          existing.id !== row.id &&
          !incomingIds.has(existing.id) &&
          existing.marketSegmentGroupId === row.marketSegmentGroupId &&
          existing.code.toLowerCase() === row.code.toLowerCase()
        )) {
          return NextResponse.json(
            { success: false, error: `Market segment code "${row.code}" already exists in this group.` },
            { status: 409 }
          );
        }
      }
      await prisma.$transaction(async (tx) => {
        for (const row of rows) {
          const data = {
            code: row.code,
            name: row.name,
            marketSegmentGroupId: row.marketSegmentGroupId,
            displaySequence: row.displaySequence,
            isActive: true,
          };
          if (row.id) {
            await tx.marketSegment.update({ where: { id: row.id }, data });
          } else {
            await tx.marketSegment.create({ data });
          }
        }
      });
      const marketSegments = await prisma.marketSegment.findMany({
        where: {
          marketSegmentGroup: { propertyModuleId: propertyModule.id },
          isActive: true,
        },
        orderBy: [{ displaySequence: "asc" }, { id: "asc" }],
      });
      return NextResponse.json({ success: true, marketSegments });
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

    /*
     * Get groups belonging to this
     * property's FOM module.
     */
    const groups =
      await prisma.marketSegmentGroup.findMany({
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
            "Please create Market Segment Groups before creating Market Segments.",
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

      const groupId = String(
        row.marketSegmentGroupId ?? ""
      ).trim();

      const displaySequence = Number(
        row.displaySequence ?? 0
      );

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

      if (!groupId) {
        errors.push({
          index,
          error: "Market Segment Group is required",
        });

        continue;
      }

      if (!groupIds.has(groupId)) {
        errors.push({
          index,
          error:
            "Invalid Market Segment Group for this property module",
        });

        continue;
      }

      if (
        !Number.isInteger(displaySequence) ||
        displaySequence < 1
      ) {
        errors.push({
          index,
          error:
            "Display Sequence must be a valid integer",
        });

        continue;
      }

      const normalizedCode =
        code.toLowerCase();

      if (codeSet.has(normalizedCode)) {
        errors.push({
          index,
          error:
            "Duplicate Market Segment code",
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

    /*
     * Check existing codes within
     * the selected groups.
     */
    const codes = body.rows.map(
      (row: any) =>
        String(row.code).trim()
    );

    const existing =
      await prisma.marketSegment.findMany({
        where: {
          marketSegmentGroup: {
            propertyModuleId:
              propertyModule.id,
          },
          code: {
            in: codes,
          },
        },
        select: {
          id: true,
          code: true,
        },
      });

    if (existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "One or more Market Segment codes already exist",
          existing,
        },
        { status: 409 }
      );
    }

    /*
     * Create records
     */
    await prisma.marketSegment.createMany({
      data: body.rows.map((row: any) => ({
        marketSegmentGroupId: Number(
          row.marketSegmentGroupId
        ),

        code: String(
          row.code
        ).trim(),

        name: String(
          row.name
        ).trim(),

        displaySequence: Number(
          row.displaySequence ?? 0
        ),
      })),
    });

    /*
     * Return saved records
     */
    const marketSegments =
      await prisma.marketSegment.findMany({
        where: {
          marketSegmentGroup: {
            propertyModuleId:
              propertyModule.id,
          },
        },
        include: {
          marketSegmentGroup: {
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
          "Market segments saved successfully",
        propertyModuleId:
          propertyModule.id,
        marketSegments,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE MARKET SEGMENTS ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to save market segments";

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