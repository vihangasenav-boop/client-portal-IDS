import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

const hasValue = (value: unknown) =>
  value !== null &&
  value !== undefined &&
  String(value).trim() !== "";

const isValidTime = (value: string | null) =>
  value !== null && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

// ==========================================
// Get FOM PropertyModule
// ==========================================

async function getFomPropertyModule(
  req: NextRequest
) {
  const token =
    req.cookies.get(
      "client-token"
    )?.value;

  if (!token) {
    throw new Error(
      "Not authenticated"
    );
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    throw new Error(
      "Invalid or expired session"
    );
  }

  if (
    decoded.role !== "CLIENT" &&
    decoded.role !==
      "PROPERTY_ADMIN"
  ) {
    throw new Error(
      "Invalid client session"
    );
  }

  const userId = Number(
    decoded.id
  );

  if (!Number.isInteger(userId)) {
    throw new Error(
      "Invalid user ID"
    );
  }

  const user =
    await prisma.propertyUsers.findUnique(
      {
        where: {
          id: userId,
        },
        select: {
          id: true,
          propertyId: true,
        },
      }
    );

  if (!user) {
    throw new Error(
      "User not found"
    );
  }

  const propertyModule =
    await prisma.propertyModule.findFirst(
      {
        where: {
          propertyId:
            user.propertyId,

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
      }
    );

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
      await getFomPropertyModule(
        req
      );

    const cancellationRules =
      await prisma.cancellationRule.findMany(
        {
          where: {
            propertyModuleId:
              propertyModule.id,

            isActive: true,
          },

          orderBy: [
            {
              displaySequence:
                "asc",
            },
            {
              id: "asc",
            },
          ],
        }
      );

    return NextResponse.json({
      success: true,

      propertyModuleId:
        propertyModule.id,

      cancellationRules,
    });
  } catch (error) {
    console.error(
      "GET CANCELLATION RULES ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load cancellation rules";

    let status = 500;

    if (
      message ===
      "Not authenticated"
    ) {
      status = 401;
    } else if (
      message ===
      "Invalid or expired session"
    ) {
      status = 401;
    } else if (
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
      {
        status,
      }
    );
  }
}

// ==========================================
// POST
// ==========================================

export async function DELETE(req: NextRequest) {
  try {
    const { propertyModule } = await getFomPropertyModule(req);
    if (req.nextUrl.searchParams.get("all") === "true") {
      const result = await prisma.cancellationRule.deleteMany({
        where: { propertyModuleId: propertyModule.id },
      });
      return NextResponse.json({ success: true, count: result.count });
    }
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "Invalid cancellation rule row." }, { status: 400 });
    }
    const result = await prisma.cancellationRule.deleteMany({
      where: { id, propertyModuleId: propertyModule.id },
    });
    if (result.count === 0) {
      return NextResponse.json({ success: false, error: "Cancellation rule not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE CANCELLATION RULE ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to delete cancellation rule.";
    const status =
      message === "Not authenticated" || message === "Invalid or expired session"
        ? 401
        : message === "Invalid client session"
          ? 403
          : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(
  req: NextRequest
) {
  try {
    const { propertyModule } =
      await getFomPropertyModule(
        req
      );

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
          { success: false, error: "Each cancellation rule row must be an object." },
          { status: 400 }
        );
      }
      const validTypes = new Set([
        "Flat",
        "Percentage",
        "Arrival Night percentage",
        "Nights",
        "Non Cancellation",
      ]);
      const rows = (body.rows as Record<string, unknown>[]).map((row) => ({
        id: Number.isInteger(Number(row.id)) && Number(row.id) > 0 ? Number(row.id) : null,
        code: String(row.code ?? "").trim(),
        name: String(row.name ?? "").trim(),
        type: String(row.type ?? "").trim(),
        amount: hasValue(row.amount) ? Number(row.amount) : Number.NaN,
        daysBeforeArrival: hasValue(row.daysBeforeArrival)
          ? Number(row.daysBeforeArrival)
          : Number.NaN,
        displaySequence: Number(row.displaySequence ?? 0),
        cancelBeforeTime: String(row.cancelBeforeTime ?? "").trim() || null,
      }));
      if (rows.some((row) =>
        !row.code ||
        !row.name ||
        !validTypes.has(row.type) ||
        !Number.isFinite(row.amount) ||
        row.amount < 0 ||
        row.amount > 100 ||
        !Number.isInteger(row.daysBeforeArrival) ||
        row.daysBeforeArrival < 0 ||
        !Number.isInteger(row.displaySequence) ||
        row.displaySequence < 1 ||
        !isValidTime(row.cancelBeforeTime)
      )) {
        return NextResponse.json(
          { success: false, error: "Cancellation rule rows contain invalid required fields." },
          { status: 400 }
        );
      }
      const existingRows = await prisma.cancellationRule.findMany({
        where: { propertyModuleId: propertyModule.id },
        select: { id: true, code: true, displaySequence: true },
      });
      const existingIds = new Set(existingRows.map((row) => row.id));
      const incomingIds = new Set(rows.flatMap((row) => row.id ? [row.id] : []));
      if (
        incomingIds.size !== rows.filter((row) => row.id).length ||
        rows.some((row) => row.id && !existingIds.has(row.id))
      ) {
        return NextResponse.json(
          { success: false, error: "A cancellation rule row does not belong to this property." },
          { status: 404 }
        );
      }
      const codes = new Set<string>();
      const sequences = new Set<number>();
      for (const row of rows) {
        const code = row.code.toLowerCase();
        if (codes.has(code)) {
          return NextResponse.json(
            { success: false, error: "Cancellation rule codes must be unique." },
            { status: 409 }
          );
        }
        codes.add(code);
        if (sequences.has(row.displaySequence)) {
          return NextResponse.json(
            { success: false, error: "Display sequences must be unique." },
            { status: 409 }
          );
        }
        sequences.add(row.displaySequence);
        if (existingRows.some((existing) =>
          existing.id !== row.id &&
          !incomingIds.has(existing.id) &&
          existing.code.toLowerCase() === code
        )) {
          return NextResponse.json(
            { success: false, error: `Cancellation rule code "${row.code}" already exists.` },
            { status: 409 }
          );
        }
        if (existingRows.some((existing) =>
          !incomingIds.has(existing.id) &&
          existing.displaySequence === row.displaySequence
        )) {
          return NextResponse.json(
            { success: false, error: "Display sequences must be unique." },
            { status: 409 }
          );
        }
      }
      await prisma.$transaction(async (tx) => {
        for (const row of rows) {
          const data = {
            code: row.code,
            name: row.name,
            type: row.type,
            amount: row.amount,
            daysBeforeArrival: row.daysBeforeArrival,
            displaySequence: row.displaySequence,
            cancelBeforeTime: row.cancelBeforeTime,
            isActive: true,
          };
          if (row.id) {
            await tx.cancellationRule.update({ where: { id: row.id }, data });
          } else {
            await tx.cancellationRule.create({
              data: { ...data, propertyModuleId: propertyModule.id },
            });
          }
        }
      });
      const cancellationRules = await prisma.cancellationRule.findMany({
        where: { propertyModuleId: propertyModule.id, isActive: true },
        orderBy: [{ displaySequence: "asc" }, { id: "asc" }],
      });
      return NextResponse.json({ success: true, cancellationRules });
    }

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
      body.rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "At least one row is required",
        },
        {
          status: 400,
        }
      );
    }

    const validTypes = [
      "Flat",
      "Percentage",
      "Arrival Night percentage",
      "Nights",
      "Non Cancellation",
    ];

    const errors: {
      index: number;
      error: string;
    }[] = [];

    const codeSet =
      new Set<string>();
    const sequenceSet =
      new Set<number>();

    for (
      let index = 0;
      index < body.rows.length;
      index++
    ) {
      const row =
        body.rows[index];

      const code = String(
        row.code ?? ""
      ).trim();

      const name = String(
        row.name ?? ""
      ).trim();

      const type = String(
        row.type ?? ""
      ).trim();

      const amount = hasValue(row.amount)
        ? Number(row.amount)
        : Number.NaN;

      const daysBeforeArrival = hasValue(row.daysBeforeArrival)
        ? Number(row.daysBeforeArrival)
        : Number.NaN;

      const displaySequence =
        Number(
          row.displaySequence ??
            0
        );

      if (!code) {
        errors.push({
          index,
          error:
            "Code is required",
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
          error:
            "Name is required",
        });
        continue;
      }

      if (name.length < 2) {
        errors.push({ index, error: "Name must be at least 2 characters" });
        continue;
      }

      if (
        !validTypes.includes(type)
      ) {
        errors.push({
          index,
          error:
            "Invalid cancellation rule type",
        });
        continue;
      }

      if (
        !Number.isFinite(amount) ||
        amount < 0 ||
        amount > 100
      ) {
        errors.push({
          index,
          error:
            "Amount must be between 0 and 100 percent",
        });
        continue;
      }

      if (
        !Number.isInteger(
          daysBeforeArrival
        ) ||
        daysBeforeArrival < 0
      ) {
        errors.push({
          index,
          error:
            "Days Before Arrival must be a valid positive integer",
        });
        continue;
      }

      if (
        !Number.isInteger(
          displaySequence
        ) ||
        displaySequence < 1
      ) {
        errors.push({
          index,
          error:
            "Display Sequence must be a positive integer",
        });
        continue;
      }

      if (sequenceSet.has(displaySequence)) {
        errors.push({ index, error: "Display Sequence must be unique" });
        continue;
      }
      sequenceSet.add(displaySequence);

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
            "Duplicate Cancellation Rule code",
        });
        continue;
      }

      codeSet.add(
        normalizedCode
      );

      const cancelBeforeTime = String(row.cancelBeforeTime ?? "").trim();
      if (!cancelBeforeTime) {
        errors.push({ index, error: "Cancel Before Time is required" });
      } else if (!isValidTime(cancelBeforeTime)) {
        errors.push({
          index,
          error:
            "Cancel Before Time must be a valid time",
        });
      }
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
    // Check existing codes
    // ======================================

    const codes =
      body.rows.map(
        (row: Record<string, unknown>) =>
          String(
            row.code ?? ""
          ).trim()
      );

    const existing = await prisma.cancellationRule.findMany({
      where: { propertyModuleId: propertyModule.id },
      select: { id: true, code: true, displaySequence: true },
    });

    if (existing.some((row) => codes.some((code: string) => row.code.toLowerCase() === code.toLowerCase()))) {
      return NextResponse.json(
        {
          success: false,
          error:
            "One or more Cancellation Rule codes already exist",
          existing,
        },
        {
          status: 409,
        }
      );
    }
    if (existing.some((row) => sequenceSet.has(row.displaySequence))) {
      return NextResponse.json(
        { success: false, error: "Display sequences must be unique." },
        { status: 409 }
      );
    }

    // ======================================
    // Create
    // ======================================

    await prisma.cancellationRule.createMany(
      {
        data: body.rows.map(
          (row: Record<string, unknown>) => ({
            propertyModuleId:
              propertyModule.id,

            code: String(
              row.code ?? ""
            ).trim(),

            name: String(
              row.name ?? ""
            ).trim(),

            type: String(
              row.type ?? ""
            ).trim(),

            amount:
              Number(
                row.amount
              ),

            daysBeforeArrival:
              Number(
                row.daysBeforeArrival
              ),

            displaySequence:
              Number(
                row.displaySequence
              ),

            cancelBeforeTime:
              hasValue(row.cancelBeforeTime)
                ? String(row.cancelBeforeTime)
                : null,
          })
        ),
      }
    );

    // ======================================
    // Return saved records
    // ======================================

    const cancellationRules =
      await prisma.cancellationRule.findMany(
        {
          where: {
            propertyModuleId:
              propertyModule.id,
          },

          orderBy: [
            {
              displaySequence:
                "asc",
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
          "Cancellation rules saved successfully",

        propertyModuleId:
          propertyModule.id,

        cancellationRules,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE CANCELLATION RULES ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to save cancellation rules";

    let status = 500;

    if (
      message ===
      "Not authenticated"
    ) {
      status = 401;
    } else if (
      message ===
      "Invalid or expired session"
    ) {
      status = 401;
    } else if (
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
      {
        status,
      }
    );
  }
}