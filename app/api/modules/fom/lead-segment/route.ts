import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

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

// ==========================================
// GET
// ==========================================

export async function GET(
  req: NextRequest
) {
  try {
    const { propertyModule } =
      await getFomPropertyModule(req);

    const leadSegments =
      await prisma.leadSegment.findMany({
        where: {
          propertyModuleId:
            propertyModule.id,

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
      });

    return NextResponse.json({
      success: true,

      propertyModuleId:
        propertyModule.id,

      leadSegments,
    });
  } catch (error) {
    console.error(
      "GET LEAD SEGMENTS ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load lead segments";

    const status =
      message === "Not authenticated" ||
      message ===
        "Invalid or expired session"
        ? 401
        : message ===
            "Invalid client session"
          ? 403
          : message ===
              "User not found"
            ? 404
            : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status,
      }
    );
  }
}

// ==========================================
// POST
// ==========================================

export async function POST(
  req: NextRequest
) {
  try {
    const { propertyModule } =
      await getFomPropertyModule(req);

    const body = await req.json();

    if (!Array.isArray(body.rows)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Rows must be an array",
        },
        {
          status: 400,
        }
      );
    }

    if (
      body.rows.some(
        (row: unknown) =>
          row === null || typeof row !== "object" || Array.isArray(row)
      )
    ) {
      return NextResponse.json(
        { success: false, error: "Each lead segment row must be an object." },
        { status: 400 }
      );
    }

    const inputRows = body.rows as Record<string, unknown>[];
    const submittedRows = inputRows.map((row, index) => ({
      id: Number.isInteger(Number(row.id)) ? Number(row.id) : null,
      code: String(row.code ?? "").trim(),
      name: String(row.name ?? "").trim(),
      isDefault: row.isDefault === true || row.isDefault === "Yes",
      sortOrder: index,
    }));

    if (submittedRows.some((row) => row.id && row.id > 0)) {
      const codeSet = new Set<string>();

      for (const row of submittedRows) {
        if (!row.code || !row.name) {
          return NextResponse.json(
            { success: false, error: "Code and name are required." },
            { status: 400 }
          );
        }

        const code = row.code.toLowerCase();
        if (codeSet.has(code)) {
          return NextResponse.json(
            { success: false, error: `Duplicate lead segment code: ${row.code}` },
            { status: 409 }
          );
        }
        codeSet.add(code);
      }

      if (submittedRows.filter((row) => row.isDefault).length > 1) {
        return NextResponse.json(
          { success: false, error: "Only one lead segment can be default." },
          { status: 400 }
        );
      }

      const existingRows = await prisma.leadSegment.findMany({
        where: { propertyModuleId: propertyModule.id },
        select: { id: true, code: true },
      });
      const existingIds = new Set(existingRows.map((row) => row.id));
      const incomingIds = new Set(
        submittedRows.flatMap((row) =>
          row.id && row.id > 0 ? [row.id] : []
        )
      );

      if (
        submittedRows.some(
          (row) => row.id && row.id > 0 && !existingIds.has(row.id)
        )
      ) {
        return NextResponse.json(
          { success: false, error: "A lead segment row does not belong to this property." },
          { status: 404 }
        );
      }

      for (const row of submittedRows) {
        const duplicate = existingRows.find(
          (existing) =>
            existing.code.toLowerCase() === row.code.toLowerCase() &&
            existing.id !== row.id &&
            !incomingIds.has(existing.id)
        );
        if (duplicate) {
          return NextResponse.json(
            { success: false, error: `Lead segment code "${row.code}" already exists.` },
            { status: 409 }
          );
        }
      }

      await prisma.$transaction(async (tx) => {
        for (const row of submittedRows) {
          const data = {
            code: row.code,
            name: row.name,
            isDefault: row.isDefault,
            isActive: true,
            sortOrder: row.sortOrder,
          };

          if (row.id && existingIds.has(row.id)) {
            await tx.leadSegment.update({
              where: { id: row.id },
              data,
            });
          } else {
            await tx.leadSegment.create({
              data: {
                ...data,
                propertyModuleId: propertyModule.id,
              },
            });
          }
        }
      });

      const leadSegments = await prisma.leadSegment.findMany({
        where: { propertyModuleId: propertyModule.id },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      });

      return NextResponse.json({
        success: true,
        message: "Lead segments saved successfully",
        propertyModuleId: propertyModule.id,
        leadSegments,
      });
    }

    // ======================================
    // VALIDATION
    // ======================================

    const errors: {
      index: number;
      error: string;
    }[] = [];

    const codeSet =
      new Set<string>();

    for (
      let index = 0;
      index < inputRows.length;
      index++
    ) {
      const row = inputRows[index];

      const code = String(
        row.code ?? ""
      ).trim();

      const name = String(
        row.name ?? ""
      ).trim();

      if (!code) {
        errors.push({
          index,
          error:
            "Code is required",
        });

        continue;
      }

      if (!name) {
        errors.push({
          index,
          error:
            "Name is required",
        });

        continue;
      }

      const normalizedCode =
        code.toLowerCase();

      if (
        codeSet.has(
          normalizedCode
        )
      ) {
        errors.push({
          index,
          error:
            "Duplicate Lead Segment code",
        });

        continue;
      }

      codeSet.add(
        normalizedCode
      );
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Validation failed",
          errors,
        },
        {
          status: 400,
        }
      );
    }

    // ======================================
    // CHECK DATABASE DUPLICATES
    // ======================================

    const codes =
      inputRows.map(
      (row) =>
          String(
            row.code
          ).trim()
      );

    const existing =
      await prisma.leadSegment.findMany(
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
            "One or more Lead Segment codes already exist",
          existing,
        },
        {
          status: 409,
        }
      );
    }

    // ======================================
    // CREATE
    // ======================================

    await prisma.leadSegment.createMany(
      {
        data: inputRows.map(
          (
            row,
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

            isDefault:
              Boolean(
                row.isDefault
              ),

            isActive: true,

            sortOrder:
              Number(
                row.sortOrder ??
                  index
              ),
          })
        ),
      }
    );

    // ======================================
    // RETURN SAVED DATA
    // ======================================

    const leadSegments =
      await prisma.leadSegment.findMany(
        {
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
        }
      );

    return NextResponse.json(
      {
        success: true,

        message:
          "Lead segments saved successfully",

        propertyModuleId:
          propertyModule.id,

        leadSegments,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE LEAD SEGMENTS ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to save lead segments";

    const status =
      message === "Not authenticated" ||
      message ===
        "Invalid or expired session"
        ? 401
        : message ===
            "Invalid client session"
          ? 403
          : message ===
              "User not found"
            ? 404
            : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status,
      }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { propertyModule } = await getFomPropertyModule(req);

    if (req.nextUrl.searchParams.get("all") === "true") {
      const result = await prisma.leadSegment.deleteMany({
        where: { propertyModuleId: propertyModule.id },
      });

      return NextResponse.json({ success: true, count: result.count });
    }

    const id = Number(req.nextUrl.searchParams.get("id"));

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid lead segment row." },
        { status: 400 }
      );
    }

    const result = await prisma.leadSegment.deleteMany({
      where: { id, propertyModuleId: propertyModule.id },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { success: false, error: "Lead segment not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE LEAD SEGMENT ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to delete lead segment.";
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