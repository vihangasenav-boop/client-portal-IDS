import { Payments } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

class RouteError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPaymentType(value: unknown): value is Payments {
  return typeof value === "string" && Object.values(Payments).includes(value as Payments);
}

function parseIdList(value: unknown, label: string): number[] {
  if (!Array.isArray(value)) throw new RouteError(`${label} must be an array.`, 400);
  if (value.some((id) => !Number.isInteger(id) || Number(id) <= 0)) {
    throw new RouteError(`${label} must contain valid IDs.`, 400);
  }
  const ids = value as number[];
  if (new Set(ids).size !== ids.length) {
    throw new RouteError(`${label} cannot contain duplicate IDs.`, 400);
  }
  return ids;
}

async function getPropertyModuleId(request: NextRequest) {
  const token = request.cookies.get("client-token")?.value;
  if (!token) throw new RouteError("Not authenticated.", 401);

  const decoded = verifyToken(token);
  if (!decoded) throw new RouteError("Invalid or expired session.", 401);
  if (!["CLIENT", "PROPERTY_ADMIN"].includes(decoded.role)) {
    throw new RouteError("Invalid client session.", 403);
  }

  const userId = Number(decoded.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new RouteError("Invalid user ID.", 401);
  }

  const user = await prisma.propertyUsers.findUnique({
    where: { id: userId },
    select: { propertyId: true },
  });
  if (!user) throw new RouteError("User not found.", 404);

  const propertyModule = await prisma.propertyModule.findFirst({
    where: {
      propertyId: user.propertyId,
      module: { code: "FOM", isActive: true },
    },
    select: { id: true },
  });
  if (!propertyModule) throw new RouteError("Property module not found.", 404);
  return propertyModule.id;
}

function errorResponse(error: unknown, operation: string) {
  console.error(`${operation} payment instructions failed:`, error);
  if (error instanceof RouteError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
    return NextResponse.json(
      { success: false, error: "A payment instruction with this code already exists for this property." },
      { status: 409 }
    );
  }
  return NextResponse.json(
    { success: false, error: `Could not ${operation.toLowerCase()} payment instructions.` },
    { status: 500 }
  );
}

async function readPaymentInstructions(propertyModuleId: number) {
  const [rows, revenueGroups, revenues] = await Promise.all([
    prisma.paymentInstructions.findMany({
      where: { propertyModuleId },
      include: {
        revenueGroups: { select: { id: true, code: true, name: true, isActive: true } },
        revenueName: { select: { id: true, code: true, name: true, isActive: true } },
      },
      orderBy: [{ displaySequence: "asc" }, { id: "asc" }],
    }),
    prisma.revenueGroup.findMany({
      where: { propertyModuleId },
      select: { id: true, code: true, name: true, isActive: true },
      orderBy: [{ code: "asc" }],
    }),
    prisma.revenue.findMany({
      where: { propertyModuleId },
      select: { id: true, code: true, name: true, isActive: true },
      orderBy: [{ displaySequence: "asc" }, { code: "asc" }],
    }),
  ]);
  return { rows, revenueGroups, revenues };
}

export async function GET(request: NextRequest) {
  try {
    const propertyModuleId = await getPropertyModuleId(request);
    const data = await readPaymentInstructions(propertyModuleId);
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    return errorResponse(error, "Load");
  }
}

export async function POST(request: NextRequest) {
  try {
    const propertyModuleId = await getPropertyModuleId(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new RouteError("Request body must be valid JSON.", 400);
    }
    if (!isRecord(body) || !Array.isArray(body.rows)) {
      throw new RouteError("Payment instruction rows must be an array.", 400);
    }

    const rows: Array<{
      id: number | null;
      code: string;
      name: string;
      nameMultilingual: string;
      displaySequence: number;
      description: string | null;
      revenueGroupIds: number[];
      revenueIds: number[];
      split: number;
      paymentType: Payments;
      transactionLimit: string | null;
      forcePayment: boolean;
    }> = [];
    const codes = new Set<string>();
    const rowIds = new Set<number>();

    for (const value of body.rows) {
      if (!isRecord(value)) {
        throw new RouteError("Each payment instruction row must be an object.", 400);
      }

      const hasId = value.id !== undefined && value.id !== null && value.id !== "";
      const id = hasId ? Number(value.id) : 0;
      const code = typeof value.code === "string" ? value.code.trim() : "";
      const name = typeof value.name === "string" ? value.name.trim() : "";
      const nameMultilingual =
        typeof value.nameMultilingual === "string" ? value.nameMultilingual.trim() : "";
      const description =
        typeof value.description === "string" ? value.description.trim() : "";
      const displaySequence = Number(value.displaySequence);
      const split = Number(value.split);
      const revenueGroupIds = parseIdList(value.revenueGroupIds, "Revenue group selections");
      const revenueIds = parseIdList(value.revenueIds, "Revenue selections");

      if (hasId && !Number.isInteger(id)) {
        throw new RouteError("A payment instruction has an invalid ID.", 400);
      }
      if (id > 0 && rowIds.has(id)) {
        throw new RouteError("Payment instruction IDs must be unique.", 400);
      }
      if (id > 0) rowIds.add(id);
      if (!code || !name || !nameMultilingual) {
        throw new RouteError("Code, name, and multilingual name are required.", 400);
      }
      if (
        code.length > 191 ||
        name.length > 191 ||
        nameMultilingual.length > 191 ||
        description.length > 191
      ) {
        throw new RouteError("Payment instruction text fields cannot exceed 191 characters.", 400);
      }
      if (!Number.isInteger(displaySequence) || displaySequence < 0 || displaySequence > 2147483647) {
        throw new RouteError("Display sequence must be a non-negative whole number.", 400);
      }
      if (!Number.isInteger(split) || split < 0 || split > 2147483647) {
        throw new RouteError("Split must be a non-negative whole number.", 400);
      }
      if (!isPaymentType(value.paymentType)) {
        throw new RouteError("Select a valid payment type.", 400);
      }
      if (typeof value.forcePayment !== "boolean") {
        throw new RouteError("Force payment must be true or false.", 400);
      }

      let transactionLimit: string | null = null;
      if (value.transactionLimit !== null && value.transactionLimit !== undefined && value.transactionLimit !== "") {
        const rawLimit =
          typeof value.transactionLimit === "number"
            ? String(value.transactionLimit)
            : typeof value.transactionLimit === "string"
              ? value.transactionLimit.trim()
              : "";
        const numericLimit = Number(rawLimit);
        if (
          !/^\d+(\.\d{1,2})?$/.test(rawLimit) ||
          !Number.isFinite(numericLimit) ||
          numericLimit > 99_999_999.99
        ) {
          throw new RouteError("Transaction limit must be a non-negative amount with up to two decimals.", 400);
        }
        transactionLimit = numericLimit.toFixed(2);
      }

      const normalizedCode = code.toLowerCase();
      if (codes.has(normalizedCode)) {
        throw new RouteError(`Duplicate payment instruction code "${code}".`, 409);
      }
      codes.add(normalizedCode);
      rows.push({
        id: id > 0 ? id : null,
        code,
        name,
        nameMultilingual,
        displaySequence,
        description: description || null,
        revenueGroupIds,
        revenueIds,
        split,
        paymentType: value.paymentType,
        transactionLimit,
        forcePayment: value.forcePayment,
      });
    }

    const [existingRows, validGroupRows, validRevenueRows] = await Promise.all([
      prisma.paymentInstructions.findMany({
        where: { propertyModuleId },
        select: { id: true, code: true },
      }),
      prisma.revenueGroup.findMany({
        where: {
          propertyModuleId,
          id: { in: [...new Set(rows.flatMap((row) => row.revenueGroupIds))] },
        },
        select: { id: true },
      }),
      prisma.revenue.findMany({
        where: {
          propertyModuleId,
          id: { in: [...new Set(rows.flatMap((row) => row.revenueIds))] },
        },
        select: { id: true },
      }),
    ]);

    const existingIds = new Set(existingRows.map((row) => row.id));
    const incomingIds = new Set(rows.flatMap((row) => row.id === null ? [] : [row.id]));
    const validGroupIds = new Set(validGroupRows.map((row) => row.id));
    const validRevenueIds = new Set(validRevenueRows.map((row) => row.id));
    for (const row of rows) {
      if (row.id !== null && !existingIds.has(row.id)) {
        throw new RouteError("A payment instruction does not belong to this property.", 404);
      }
      if (row.revenueGroupIds.some((groupId) => !validGroupIds.has(groupId))) {
        throw new RouteError("Select revenue groups that belong to this property.", 400);
      }
      if (row.revenueIds.some((revenueId) => !validRevenueIds.has(revenueId))) {
        throw new RouteError("Select revenues that belong to this property.", 400);
      }
      const duplicate = existingRows.find((existing) =>
        existing.id !== row.id &&
        !incomingIds.has(existing.id) &&
        existing.code.toLowerCase() === row.code.toLowerCase()
      );
      if (duplicate) {
        throw new RouteError(`Payment instruction code "${row.code}" already exists.`, 409);
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const data = {
          code: row.code,
          name: row.name,
          nameMultilingual: row.nameMultilingual,
          displaySequence: row.displaySequence,
          description: row.description,
          split: row.split,
          paymentType: row.paymentType,
          transactionLimit: row.transactionLimit,
          forcePayment: row.forcePayment,
          revenueGroups: {
            set: row.revenueGroupIds.map((id) => ({ id })),
          },
          revenueName: {
            set: row.revenueIds.map((id) => ({ id })),
          },
        };
        if (row.id !== null) {
          await tx.paymentInstructions.update({ where: { id: row.id }, data });
        } else {
          await tx.paymentInstructions.create({
            data: {
              ...data,
              propertyModuleId,
              revenueGroups: {
                connect: row.revenueGroupIds.map((id) => ({ id })),
              },
              revenueName: {
                connect: row.revenueIds.map((id) => ({ id })),
              },
            },
          });
        }
      }
    });

    const data = await readPaymentInstructions(propertyModuleId);
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    return errorResponse(error, "Save");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const propertyModuleId = await getPropertyModuleId(request);
    const idValue = request.nextUrl.searchParams.get("id");
    if (!idValue || !/^[1-9]\d*$/.test(idValue)) {
      throw new RouteError("A valid payment instruction ID is required.", 400);
    }
    const result = await prisma.paymentInstructions.deleteMany({
      where: { id: Number(idValue), propertyModuleId },
    });
    if (result.count === 0) {
      throw new RouteError("Payment instruction was not found for this property.", 404);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Delete");
  }
}
