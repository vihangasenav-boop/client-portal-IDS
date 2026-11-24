import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      code,
      name,
      address,
      modules = [],
      users = [],
    } = body;

    // -----------------------------------------
    // Validate property
    // -----------------------------------------

    const trimmedCode =
      typeof code === "string" ? code.trim() : "";

    const trimmedName =
      typeof name === "string" ? name.trim() : "";

    const trimmedAddress =
      typeof address === "string" ? address.trim() : "";

    if (!trimmedCode) {
      return NextResponse.json(
        { error: "Property code is required" },
        { status: 400 }
      );
    }

    if (!trimmedName) {
      return NextResponse.json(
        { error: "Property name is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(modules)) {
      return NextResponse.json(
        { error: "Modules must be an array" },
        { status: 400 }
      );
    }

    if (!Array.isArray(users)) {
      return NextResponse.json(
        { error: "Users must be an array" },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // Clean module codes
    // -----------------------------------------

    const moduleCodes = [
      ...new Set(
        modules
          .filter((module: unknown) => typeof module === "string")
          .map((module: string) => module.trim())
          .filter(Boolean)
      ),
    ];

    // -----------------------------------------
    // Validate users
    // -----------------------------------------

    const cleanedUsers = users.map((user: any) => ({
      name: typeof user.name === "string" ? user.name.trim() : "",
      email: typeof user.email === "string"
        ? user.email.trim().toLowerCase()
        : "",
      password:
        typeof user.password === "string"
          ? user.password
          : "",
      role:
        typeof user.role === "string"
          ? user.role
          : "CLIENT",
    }));

    for (const user of cleanedUsers) {
      if (!user.name || !user.email || !user.password) {
        return NextResponse.json(
          {
            error:
              "Each property user must include name, email and password",
          },
          { status: 400 }
        );
      }
    }

    // -----------------------------------------
    // Check duplicate property code
    // -----------------------------------------

    const existingProperty = await prisma.property.findUnique({
      where: {
        code: trimmedCode,
      },
    });

    if (existingProperty) {
      return NextResponse.json(
        {
          error: `Property code "${trimmedCode}" already exists`,
        },
        { status: 409 }
      );
    }

    // -----------------------------------------
    // Check duplicate emails
    // -----------------------------------------

    const emails = cleanedUsers.map((user) => user.email);

    if (new Set(emails).size !== emails.length) {
      return NextResponse.json(
        {
          error: "Duplicate user email addresses are not allowed",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // Check existing user emails
    // -----------------------------------------

    if (emails.length > 0) {
      const existingUsers = await prisma.propertyUsers.findMany({
        where: {
          email: {
            in: emails,
          },
        },
        select: {
          email: true,
        },
      });

      if (existingUsers.length > 0) {
        return NextResponse.json(
          {
            error: `User email already exists: ${existingUsers
              .map((user) => user.email)
              .join(", ")}`,
          },
          { status: 409 }
        );
      }
    }

    // -----------------------------------------
    // Find modules
    // -----------------------------------------

    const dbModules =
      moduleCodes.length > 0
        ? await prisma.module.findMany({
            where: {
              code: {
                in: moduleCodes,
              },
              isActive: true,
            },
            select: {
              id: true,
              code: true,
            },
          })
        : [];

    // Check whether all requested modules exist
    const foundModuleCodes = new Set(
      dbModules.map((module) => module.code)
    );

    const missingModules = moduleCodes.filter(
      (code) => !foundModuleCodes.has(code)
    );

    if (missingModules.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid or inactive modules: ${missingModules.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // TRANSACTION
    // -----------------------------------------

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create property
      const property = await tx.property.create({
        data: {
          code: trimmedCode,
          name: trimmedName,
          address: trimmedAddress || null,
        },
      });

      // 2. Create property users
      for (const user of cleanedUsers) {
        const hashedPassword = await bcrypt.hash(user.password, 12);

        await tx.propertyUsers.create({
          data: {
            propertyId: property.id,
            name: user.name,
            email: user.email,
            password: hashedPassword,
            role: user.role === "PROPERTY_ADMIN"
              ? "PROPERTY_ADMIN"
              : "CLIENT",
          },
        });
      }

      // 3. Create property-module relationships
      if (dbModules.length > 0) {
        await tx.propertyModule.createMany({
          data: dbModules.map((module) => ({
            propertyId: property.id,
            moduleId: module.id,
          })),
          skipDuplicates: true,
        });
      }

      // 4. Return complete property
      return await tx.property.findUnique({
        where: {
          id: property.id,
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
            },
          },
          propertyModules: {
            include: {
              module: true,
            },
          },
        },
      });
    });

    return NextResponse.json(
      {
        message: "Property created successfully",
        property: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create property error:", error);

    return NextResponse.json(
      {
        error: "Unable to create property",
        details:
          process.env.NODE_ENV === "development"
            ? error?.message
            : undefined,
      },
      { status: 500 }
    );
  }
}


