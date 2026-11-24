import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

type QueryContext = {
  propertyId: number;
  propertyModuleIds: number[];
};

type DataTable = {
  key: string;
  label: string;
  load: (context: QueryContext) => Promise<unknown[]>;
};

const tables: DataTable[] = [
  {
    key: "property",
    label: "Property",
    load: ({ propertyId }) =>
      prisma.property.findMany({ where: { id: propertyId }, orderBy: { id: "asc" } }),
  },
  {
    key: "property-users",
    label: "Property Users",
    load: ({ propertyId }) =>
      prisma.propertyUsers.findMany({
        where: { propertyId },
        select: {
          id: true,
          propertyId: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { id: "asc" },
      }),
  },
  {
    key: "property-modules",
    label: "Property Modules",
    load: ({ propertyId }) =>
      prisma.propertyModule.findMany({
        where: { propertyId },
        include: {
          module: { select: { id: true, code: true, name: true, description: true, isActive: true } },
        },
        orderBy: { id: "asc" },
      }),
  },
  {
    key: "account-types",
    label: "Account Types",
    load: ({ propertyModuleIds }) =>
      prisma.accountType.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "sub-account-types",
    label: "Sub Account Types",
    load: ({ propertyModuleIds }) =>
      prisma.subAccountType.findMany({
        where: { accountType: { propertyModuleId: { in: propertyModuleIds } } },
        include: { accountType: { select: { id: true, code: true, name: true } } },
        orderBy: { id: "asc" },
      }),
  },
  {
    key: "lead-sources",
    label: "Lead Sources",
    load: ({ propertyModuleIds }) =>
      prisma.leadSource.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "lead-segments",
    label: "Lead Segments",
    load: ({ propertyModuleIds }) =>
      prisma.leadSegment.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "reservation-types",
    label: "Reservation Types",
    load: ({ propertyModuleIds }) =>
      prisma.reservationType.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "business-source-groups",
    label: "Business Source Groups",
    load: ({ propertyModuleIds }) =>
      prisma.businessSourceGroup.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "business-sources",
    label: "Business Sources",
    load: ({ propertyModuleIds }) =>
      prisma.businessSource.findMany({
        where: { businessSourceGroup: { propertyModuleId: { in: propertyModuleIds } } },
        include: { businessSourceGroup: { select: { id: true, code: true, name: true } } },
        orderBy: { id: "asc" },
      }),
  },
  {
    key: "market-segment-groups",
    label: "Market Segment Groups",
    load: ({ propertyModuleIds }) =>
      prisma.marketSegmentGroup.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "market-segments",
    label: "Market Segments",
    load: ({ propertyModuleIds }) =>
      prisma.marketSegment.findMany({
        where: { marketSegmentGroup: { propertyModuleId: { in: propertyModuleIds } } },
        include: { marketSegmentGroup: { select: { id: true, code: true, name: true } } },
        orderBy: { id: "asc" },
      }),
  },
  {
    key: "channel-groups",
    label: "Channel Groups",
    load: ({ propertyModuleIds }) =>
      prisma.channelGroup.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "channels",
    label: "Channels",
    load: ({ propertyModuleIds }) =>
      prisma.channel.findMany({
        where: { channelGroup: { propertyModuleId: { in: propertyModuleIds } } },
        include: { channelGroup: { select: { id: true, code: true, name: true } } },
        orderBy: { id: "asc" },
      }),
  },
  {
    key: "origins",
    label: "Origins",
    load: ({ propertyModuleIds }) =>
      prisma.origin.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "cancellation-rules",
    label: "Cancellation Rules",
    load: ({ propertyModuleIds }) =>
      prisma.cancellationRule.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "room-blocks",
    label: "Room Blocks",
    load: ({ propertyModuleIds }) =>
      prisma.roomBlock.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "room-floors",
    label: "Room Floors",
    load: ({ propertyModuleIds }) =>
      prisma.roomFloor.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "room-features",
    label: "Room Features",
    load: ({ propertyModuleIds }) =>
      prisma.roomFeature.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "room-amenities",
    label: "Room Amenities",
    load: ({ propertyModuleIds }) =>
      prisma.roomAmenity.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "room-types",
    label: "Room Types",
    load: ({ propertyModuleIds }) =>
      prisma.roomType.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "room-type-features",
    label: "Room Type Features",
    load: ({ propertyModuleIds }) =>
      prisma.roomTypeFeature.findMany({
        where: { roomType: { propertyModuleId: { in: propertyModuleIds } } },
        include: {
          roomType: { select: { id: true, code: true, name: true } },
          roomFeature: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ roomTypeId: "asc" }, { roomFeatureId: "asc" }],
      }),
  },
  {
    key: "room-type-amenities",
    label: "Room Type Amenities",
    load: ({ propertyModuleIds }) =>
      prisma.roomTypeAmenity.findMany({
        where: { roomType: { propertyModuleId: { in: propertyModuleIds } } },
        include: {
          roomType: { select: { id: true, code: true, name: true } },
          roomAmenity: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ roomTypeId: "asc" }, { roomAmenityId: "asc" }],
      }),
  },
  {
    key: "revenues",
    label: "Revenues",
    load: ({ propertyModuleIds }) =>
      prisma.revenue.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "revenue-groups",
    label: "Revenue Groups",
    load: ({ propertyModuleIds }) =>
      prisma.revenueGroup.findMany({
        where: { propertyModuleId: { in: propertyModuleIds } },
        include: { revenueName: { select: { id: true, code: true, name: true } } },
        orderBy: { id: "asc" },
      }),
  },
  {
    key: "payment-instructions",
    label: "Payment Instructions",
    load: ({ propertyModuleIds }) =>
      prisma.paymentInstructions.findMany({
        where: { propertyModuleId: { in: propertyModuleIds } },
        include: {
          revenueGroups: { select: { id: true, code: true, name: true } },
          revenueName: { select: { id: true, code: true, name: true } },
        },
        orderBy: { id: "asc" },
      }),
  },
  {
    key: "guest-statuses",
    label: "Guest Statuses",
    load: ({ propertyModuleIds }) =>
      prisma.guestStatus.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "designations",
    label: "Designations",
    load: ({ propertyModuleIds }) =>
      prisma.designations.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "document-types",
    label: "Document Types",
    load: ({ propertyModuleIds }) =>
      prisma.documentType.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "preference-groups",
    label: "Preference Groups",
    load: ({ propertyModuleIds }) =>
      prisma.preferenceGroups.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "preferences",
    label: "Preferences",
    load: ({ propertyModuleIds }) =>
      prisma.preference.findMany({
        where: { preferenceGroup: { propertyModuleId: { in: propertyModuleIds } } },
        include: { preferenceGroup: { select: { id: true, code: true, name: true } } },
        orderBy: { id: "asc" },
      }),
  },
  {
    key: "membership-classes",
    label: "Membership Classes",
    load: ({ propertyModuleIds }) =>
      prisma.membershipClass.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "membership-types",
    label: "Membership Types",
    load: ({ propertyModuleIds }) =>
      prisma.membershipType.findMany({
        where: { membershipClass: { propertyModuleId: { in: propertyModuleIds } } },
        include: { membershipClass: { select: { id: true, code: true, name: true } } },
        orderBy: { id: "asc" },
      }),
  },
  {
    key: "dislike-types",
    label: "Dislike Types",
    load: ({ propertyModuleIds }) =>
      prisma.dislikeType.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "departments",
    label: "Departments",
    load: ({ propertyModuleIds }) =>
      prisma.departments.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "sections",
    label: "Sections",
    load: ({ propertyModuleIds }) =>
      prisma.sections.findMany({
        where: { department: { propertyModuleId: { in: propertyModuleIds } } },
        include: { department: { select: { id: true, code: true, name: true } } },
        orderBy: { id: "asc" },
      }),
  },
  {
    key: "reasons",
    label: "Reasons",
    load: ({ propertyModuleIds }) =>
      prisma.reasons.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
  {
    key: "trace-definitions",
    label: "Trace Definitions",
    load: ({ propertyModuleIds }) =>
      prisma.traceDefinitions.findMany({
        where: { department: { propertyModuleId: { in: propertyModuleIds } } },
        include: { department: { select: { id: true, code: true, name: true } } },
        orderBy: { id: "asc" },
      }),
  },
  {
    key: "offers",
    label: "Offers",
    load: ({ propertyModuleIds }) =>
      prisma.offers.findMany({ where: { propertyModuleId: { in: propertyModuleIds } }, orderBy: { id: "asc" } }),
  },
];

export async function GET(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const decoded = token ? verifyToken(token) : null;
  if (!decoded || decoded.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const code = request.nextUrl.searchParams.get("code")?.trim();
  try {
    if (!code) {
      const properties = await prisma.property.findMany({
        select: { id: true, code: true, name: true, address: true },
        orderBy: [{ name: "asc" }, { code: "asc" }],
      });
      return NextResponse.json({ properties });
    }

    const property = await prisma.property.findUnique({
      where: { code },
      select: { id: true, code: true, name: true, address: true },
    });
    if (!property) {
      return NextResponse.json({ error: "No hotel was found with that code." }, { status: 404 });
    }

    const propertyModules = await prisma.propertyModule.findMany({
      where: { propertyId: property.id },
      select: { id: true },
    });
    const context: QueryContext = {
      propertyId: property.id,
      propertyModuleIds: propertyModules.map((module) => module.id),
    };
    const tableKey = request.nextUrl.searchParams.get("table");
    const requestedTableKeys = request.nextUrl.searchParams.get("tables");

    if (!tableKey && requestedTableKeys === null) {
      return NextResponse.json({
        property,
        tables: tables.map(({ key, label }) => ({ key, label })),
      });
    }

    if (tableKey === "all") {
      const allTables: Array<{ key: string; label: string; rows: unknown[] }> = [];
      for (const table of tables) {
        allTables.push({
          key: table.key,
          label: table.label,
          rows: await table.load(context),
        });
      }
      return NextResponse.json({ property, tables: allTables });
    }

    if (requestedTableKeys !== null) {
      const keys = [...new Set(requestedTableKeys.split(",").map((key) => key.trim()).filter(Boolean))];
      const selectedTables = keys.map((key) => tables.find((table) => table.key === key));
      if (keys.length === 0 || selectedTables.some((table) => !table)) {
        return NextResponse.json({ error: "Select one or more valid property data tables." }, { status: 400 });
      }

      const selectedData: Array<{ key: string; label: string; rows: unknown[] }> = [];
      for (const table of selectedTables) {
        if (!table) continue;
        selectedData.push({
          key: table.key,
          label: table.label,
          rows: await table.load(context),
        });
      }
      return NextResponse.json({ property, tables: selectedData });
    }

    if (!tableKey) {
      return NextResponse.json({ error: "Select one or more property data tables." }, { status: 400 });
    }

    const table = tables.find((candidate) => candidate.key === tableKey);
    if (!table) {
      return NextResponse.json({ error: "Unknown property data table." }, { status: 400 });
    }

    const rows = await table.load(context);
    return NextResponse.json({
      property,
      table: { key: table.key, label: table.label },
      rows,
    });
  } catch (error) {
    console.error("Failed to load property data:", error);
    return NextResponse.json({ error: "Unable to load property data." }, { status: 500 });
  }
}
