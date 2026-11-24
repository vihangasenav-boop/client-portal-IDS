import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

// =====================================================
// GET AUTHENTICATED FOM PROPERTY MODULE
// =====================================================

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

  const decoded =
    verifyToken(token);

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

// =====================================================
// GET CHANNELS
// =====================================================

export async function GET(
  req: NextRequest
) {
  try {
    const {
      propertyModule,
    } =
      await getFomPropertyModule(
        req
      );

    const channels =
      await prisma.channel.findMany(
        {
          where: {
            channelGroup: {
              propertyModuleId:
                propertyModule.id,
            },

            isActive: true,
          },

          include: {
            channelGroup: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
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

      channels,
    });
  } catch (error) {
    console.error(
      "GET CHANNELS ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load channels";

    let status = 500;

    if (
      message ===
        "Not authenticated" ||
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

// =====================================================
export async function DELETE(req: NextRequest) {
  try {
    const { propertyModule } = await getFomPropertyModule(req);
    if (req.nextUrl.searchParams.get("all") === "true") {
      const result = await prisma.channel.deleteMany({
        where: { channelGroup: { propertyModuleId: propertyModule.id } },
      });
      return NextResponse.json({ success: true, count: result.count });
    }
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "Invalid channel row." }, { status: 400 });
    }
    const result = await prisma.channel.deleteMany({
      where: { id, channelGroup: { propertyModuleId: propertyModule.id } },
    });
    if (result.count === 0) {
      return NextResponse.json({ success: false, error: "Channel not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE CHANNEL ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to delete channel.";
    const status =
      message === "Not authenticated" || message === "Invalid or expired session"
        ? 401
        : message === "Invalid client session"
          ? 403
          : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

// POST CHANNELS
// =====================================================

export async function POST(
  req: NextRequest
) {
  try {
    const {
      propertyModule,
    } =
      await getFomPropertyModule(
        req
      );

    const body =
      await req.json();

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
          { success: false, error: "Each channel row must be an object." },
          { status: 400 }
        );
      }
      const rows = (body.rows as Record<string, unknown>[]).map((row) => ({
        id: Number.isInteger(Number(row.id)) && Number(row.id) > 0 ? Number(row.id) : null,
        code: String(row.code ?? "").trim(),
        name: String(row.name ?? "").trim(),
        channelGroupId: Number(row.channelGroupId),
        displaySequence: Number(row.displaySequence ?? 0),
      }));
      const groups = await prisma.channelGroup.findMany({
        where: { propertyModuleId: propertyModule.id, isActive: true },
        select: { id: true },
      });
      const groupIds = new Set(groups.map((group) => group.id));
      if (rows.some((row) =>
        !row.code ||
        !row.name ||
        !Number.isInteger(row.channelGroupId) ||
        !groupIds.has(row.channelGroupId) ||
        !Number.isInteger(row.displaySequence) ||
        row.displaySequence < 0
      )) {
        return NextResponse.json(
          { success: false, error: "Channel rows contain invalid group, code, name, or display sequence values." },
          { status: 400 }
        );
      }
      const existingRows = await prisma.channel.findMany({
        where: { channelGroup: { propertyModuleId: propertyModule.id } },
        select: { id: true, code: true, channelGroupId: true },
      });
      const existingIds = new Set(existingRows.map((row) => row.id));
      const incomingIds = new Set(rows.flatMap((row) => row.id ? [row.id] : []));
      if (
        incomingIds.size !== rows.filter((row) => row.id).length ||
        rows.some((row) => row.id && !existingIds.has(row.id))
      ) {
        return NextResponse.json(
          { success: false, error: "A channel row does not belong to this property." },
          { status: 404 }
        );
      }
      const codes = new Set<string>();
      for (const row of rows) {
        const key = `${row.channelGroupId}:${row.code.toLowerCase()}`;
        if (codes.has(key)) {
          return NextResponse.json(
            { success: false, error: "Channel codes must be unique within each group." },
            { status: 409 }
          );
        }
        codes.add(key);
        if (existingRows.some((existing) =>
          existing.id !== row.id &&
          !incomingIds.has(existing.id) &&
          existing.channelGroupId === row.channelGroupId &&
          existing.code.toLowerCase() === row.code.toLowerCase()
        )) {
          return NextResponse.json(
            { success: false, error: `Channel code "${row.code}" already exists in this group.` },
            { status: 409 }
          );
        }
      }
      await prisma.$transaction(async (tx) => {
        for (const row of rows) {
          const data = {
            code: row.code,
            name: row.name,
            channelGroupId: row.channelGroupId,
            displaySequence: row.displaySequence,
            isActive: true,
          };
          if (row.id) {
            await tx.channel.update({ where: { id: row.id }, data });
          } else {
            await tx.channel.create({ data });
          }
        }
      });
      const channels = await prisma.channel.findMany({
        where: {
          channelGroup: { propertyModuleId: propertyModule.id },
          isActive: true,
        },
        orderBy: [{ displaySequence: "asc" }, { id: "asc" }],
      });
      return NextResponse.json({ success: true, channels });
    }

    if (
      !Array.isArray(body.rows)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Rows must be an array",
        },
        { status: 400 }
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
        { status: 400 }
      );
    }

    // =================================================
    // GET VALID CHANNEL GROUPS
    // =================================================

    const channelGroups =
      await prisma.channelGroup.findMany(
        {
          where: {
            propertyModuleId:
              propertyModule.id,

            isActive: true,
          },

          select: {
            id: true,
          },
        }
      );

    if (
      channelGroups.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please create Channel Groups before creating Channels.",
        },
        { status: 400 }
      );
    }

    const validGroupIds =
      new Set(
        channelGroups.map(
          (group) => group.id
        )
      );

    // =================================================
    // VALIDATE ROWS
    // =================================================

    const errors: {
      index: number;
      error: string;
    }[] = [];

    const codeSet =
      new Set<string>();

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

      const channelGroupId =
        Number(
          row.channelGroupId
        );

      const displaySequence =
        Number(
          row.displaySequence ?? 0
        );

      // Code
      if (!code) {
        errors.push({
          index,
          error:
            "Code is required",
        });

        continue;
      }

      // Name
      if (!name) {
        errors.push({
          index,
          error:
            "Name is required",
        });

        continue;
      }

      // Channel Group
      if (
        !Number.isInteger(
          channelGroupId
        ) ||
        !validGroupIds.has(
          channelGroupId
        )
      ) {
        errors.push({
          index,
          error:
            "Invalid Channel Group for this property module",
        });

        continue;
      }

      // Display Sequence
      if (
        !Number.isInteger(
          displaySequence
        ) ||
        displaySequence < 0
      ) {
        errors.push({
          index,
          error:
            "Display Sequence must be a non-negative integer",
        });

        continue;
      }

      // Duplicate code
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
            "Duplicate Channel code",
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
        { status: 400 }
      );
    }

    // =================================================
    // CREATE CHANNELS
    // =================================================

    await prisma.channel.createMany(
      {
        data: body.rows.map(
          (row: any) => ({
            channelGroupId:
              Number(
                row.channelGroupId
              ),

            code: String(
              row.code
            ).trim(),

            name: String(
              row.name
            ).trim(),

            displaySequence:
              Number(
                row.displaySequence ??
                  0
              ),

            isActive: true,
          })
        ),
      }
    );

    // =================================================
    // RETURN SAVED DATA
    // =================================================

    const channels =
      await prisma.channel.findMany(
        {
          where: {
            channelGroup: {
              propertyModuleId:
                propertyModule.id,
            },

            isActive: true,
          },

          include: {
            channelGroup: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
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
          "Channels saved successfully",

        propertyModuleId:
          propertyModule.id,

        channels,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE CHANNELS ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to save channels";

    let status = 500;

    if (
      message ===
        "Not authenticated" ||
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