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

  return propertyModule;
}

/**
 * GET Reservation Types
 */
export async function GET(req: NextRequest) {
  try {
    const propertyModule =
      await getFomPropertyModule(req);

    const reservationTypes =
      await prisma.reservationType.findMany({
        where: {
          propertyModuleId: propertyModule.id,
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
      reservationTypes,
    });
  } catch (error) {
    console.error(
      "GET RESERVATION TYPES ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load reservation types";

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
 * POST Reservation Types
 */
export async function POST(req: NextRequest) {
  try {
    const propertyModule =
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
      if (
        body.rows.some(
          (row: unknown) =>
            row === null || typeof row !== "object" || Array.isArray(row)
        )
      ) {
        return NextResponse.json(
          { success: false, error: "Each reservation type row must be an object." },
          { status: 400 }
        );
      }

      const rows = (body.rows as Record<string, unknown>[]).map(
        (row) => ({
          id: Number.isInteger(Number(row.id)) && Number(row.id) > 0 ? Number(row.id) : null,
          code: String(row.code ?? "").trim(),
          name: String(row.name ?? "").trim(),
          group: String(row.group ?? "").trim(),
          displaySequence: Number(row.displaySequence ?? 0),
          isDefault: row.isDefault === true || row.isDefault === "Yes",
        })
      );
      const validGroups = new Set(["WAITLIST", "CONFIRM", "TENTATIVE"]);
      if (
        rows.some(
          (row) =>
            !row.code ||
            !row.name ||
            !validGroups.has(row.group) ||
            !Number.isInteger(row.displaySequence) ||
            row.displaySequence < 0
        )
      ) {
        return NextResponse.json(
          { success: false, error: "Reservation type rows contain invalid required fields." },
          { status: 400 }
        );
      }

      const existingRows = await prisma.reservationType.findMany({
        where: { propertyModuleId: propertyModule.id },
        select: { id: true, code: true, name: true, isDefault: true },
      });
      const existingIds = new Set(existingRows.map((row) => row.id));
      const incomingIds = new Set(rows.flatMap((row) => row.id ? [row.id] : []));
      if (
        incomingIds.size !== rows.filter((row) => row.id).length ||
        rows.some((row) => row.id && !existingIds.has(row.id))
      ) {
        return NextResponse.json(
          { success: false, error: "A reservation type row does not belong to this property." },
          { status: 404 }
        );
      }

      const codes = new Set<string>();
      for (const row of rows) {
        const code = row.code.toLowerCase();
        if (codes.has(code)) {
          return NextResponse.json(
            { success: false, error: "Reservation type codes must be unique." },
            { status: 409 }
          );
        }
        codes.add(code);
        const duplicate = existingRows.find(
          (existing) =>
            existing.id !== row.id &&
            !incomingIds.has(existing.id) &&
            existing.code.toLowerCase() === code
        );
        if (duplicate) {
          return NextResponse.json(
            { success: false, error: `Reservation type code "${row.code}" already exists.` },
            { status: 409 }
          );
        }
      }
      await prisma.$transaction(async (tx) => {
        for (const row of rows) {
          const data = {
            code: row.code,
            name: row.name,
            group: row.group as "WAITLIST" | "CONFIRM" | "TENTATIVE",
            displaySequence: row.displaySequence,
            isDefault: row.isDefault,
            isActive: true,
          };
          if (row.id) {
            await tx.reservationType.update({ where: { id: row.id }, data });
          } else {
            await tx.reservationType.create({
              data: { ...data, propertyModuleId: propertyModule.id },
            });
          }
        }
      });

      const reservationTypes = await prisma.reservationType.findMany({
        where: { propertyModuleId: propertyModule.id, isActive: true },
        orderBy: [{ displaySequence: "asc" }, { id: "asc" }],
      });
      return NextResponse.json({ success: true, reservationTypes });
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

    const validGroups = [
      "WAITLIST",
      "CONFIRM",
      "TENTATIVE",
    ];

    const errors: {
      index: number;
      error: string;
    }[] = [];

    const codeSet = new Set<string>();

    for (let index = 0; index < body.rows.length; index++) {
      const row = body.rows[index];

      const code = String(
        row.code ?? ""
      ).trim();

      const name = String(
        row.name ?? ""
      ).trim();

      const group = String(
        row.group ?? ""
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

      if (!name) {
        errors.push({
          index,
          error: "Name is required",
        });
        continue;
      }

      if (!validGroups.includes(group)) {
        errors.push({
          index,
          error: "Invalid reservation type group",
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
            "Display sequence must be a valid integer",
        });
        continue;
      }

      const normalizedCode =
        code.toLowerCase();

      if (codeSet.has(normalizedCode)) {
        errors.push({
          index,
          error:
            "Duplicate reservation type code",
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
      await prisma.reservationType.findMany({
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
      });

    if (existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "One or more reservation type codes already exist",
          existing,
        },
        { status: 409 }
      );
    }

    /**
     * Create records
     */
    await prisma.reservationType.createMany({
      data: body.rows.map((row: any) => ({
        propertyModuleId:
          propertyModule.id,

        code: String(
          row.code
        ).trim(),

        name: String(
          row.name
        ).trim(),

        group: String(
          row.group
        ).trim() as
          | "WAITLIST"
          | "CONFIRM"
          | "TENTATIVE",

        displaySequence: Number(
          row.displaySequence ?? 0
        ),

        isDefault:
          Boolean(row.isDefault),

        isActive: true,
      })),
    });

    /**
     * Return saved records
     */
    const reservationTypes =
      await prisma.reservationType.findMany({
        where: {
          propertyModuleId:
            propertyModule.id,
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
          "Reservation types saved successfully",
        propertyModuleId:
          propertyModule.id,
        reservationTypes,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE RESERVATION TYPES ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to save reservation types";

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

export async function DELETE(req: NextRequest) {
  try {
    const propertyModule = await getFomPropertyModule(req);
    if (req.nextUrl.searchParams.get("all") === "true") {
      const result = await prisma.reservationType.deleteMany({
        where: { propertyModuleId: propertyModule.id },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid reservation type row." },
        { status: 400 }
      );
    }
    const result = await prisma.reservationType.deleteMany({
      where: { id, propertyModuleId: propertyModule.id },
    });
    if (result.count === 0) {
      return NextResponse.json(
        { success: false, error: "Reservation type not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE RESERVATION TYPE ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to delete reservation type.";
    const status =
      message === "Not authenticated" || message === "Invalid or expired session"
        ? 401
        : message === "Invalid client session"
          ? 403
          : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}