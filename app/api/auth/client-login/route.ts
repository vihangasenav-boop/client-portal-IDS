import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const propertyCode = String(body.propertyCode ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!propertyCode || !email || !password) {
      return NextResponse.json(
        {
          error: "Property code, email and password are required",
        },
        { status: 400 }
      );
    }

    // Find property
    const property = await prisma.property.findUnique({
      where: {
        code: propertyCode,
      },
    });

    if (!property) {
      return NextResponse.json(
        {
          error: "Invalid property code",
        },
        { status: 401 }
      );
    }

    // Find client user
    const user = await prisma.propertyUsers.findFirst({
      where: {
        propertyId: property.id,
        email,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // Check password
    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return NextResponse.json(
        {
          error: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // Get active modules
    const propertyModules = await prisma.propertyModule.findMany({
      where: {
        propertyId: property.id,
        module: {
          isActive: true,
        },
      },
      include: {
        module: true,
      },
      orderBy: {
        module: {
          sortOrder: "asc",
        },
      },
    });

    const allowedModules = propertyModules.map(
      (item) => item.module.code
    );

    // Create JWT
    const token = signToken({
      id: String(user.id),
      propertyId: String(property.id),
      propertyCode: property.code,
      email: user.email,
      role: user.role,
    });

    console.log("JWT payload:", {
      id: String(user.id),
      propertyId: String(property.id),
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      message: "Login successful",

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        propertyId: property.id,
        propertyCode: property.code,
        propertyName: property.name,
        allowedModules,
      },

      property: {
        id: property.id,
        code: property.code,
        name: property.name,
        address: property.address,
      },
    });

    // IMPORTANT:
    // Use ONE cookie name everywhere.
    response.cookies.set("client-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("CLIENT LOGIN ERROR:", error);

    return NextResponse.json(
      {
        error: "Something went wrong during login",
      },
      { status: 500 }
    );
  }
}










// import { prisma } from "@/lib/prisma";
// import { NextRequest, NextResponse } from "next/server";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";

// export const runtime = "nodejs";

// export async function POST(req: NextRequest) {
//   try {
//     const { propertyCode, email, password } = await req.json();

//     // -----------------------------
//     // 1. Validate input
//     // -----------------------------

//     if (!propertyCode || !email || !password) {
//       return NextResponse.json(
//         {
//           error: "Property code, email and password are required",
//         },
//         { status: 400 }
//       );
//     }

//     const normalizedPropertyCode = String(propertyCode).trim();
//     const normalizedEmail = String(email).trim().toLowerCase();

//     // -----------------------------
//     // 2. Find property
//     // -----------------------------

//     const property = await prisma.property.findUnique({
//       where: {
//         code: normalizedPropertyCode,
//       },
//     });

//     if (!property) {
//       return NextResponse.json(
//         {
//           error: "Invalid property code",
//         },
//         { status: 401 }
//       );
//     }

//     // -----------------------------
//     // 3. Find property user
//     // -----------------------------

//     const user = await prisma.propertyUsers.findFirst({
//       where: {
//         propertyId: property.id,
//         email: normalizedEmail,
//       },
//     });

//     if (!user) {
//       return NextResponse.json(
//         {
//           error: "Invalid email or password",
//         },
//         { status: 401 }
//       );
//     }

//     // -----------------------------
//     // 4. Check password
//     // -----------------------------

//     const passwordMatch = await bcrypt.compare(
//       password,
//       user.password
//     );

//     if (!passwordMatch) {
//       return NextResponse.json(
//         {
//           error: "Invalid email or password",
//         },
//         { status: 401 }
//       );
//     }

//     // -----------------------------
//     // 5. Get modules assigned
//     //    to this property
//     // -----------------------------

//     const propertyModules = await prisma.propertyModule.findMany({
//       where: {
//         propertyId: property.id,
//       },
//       include: {
//         module: {
//           select: {
//             id: true,
//             code: true,
//             name: true,
//             description: true,
//             isActive: true,
//             sortOrder: true,
//           },
//         },
//       },
//       orderBy: {
//         module: {
//           sortOrder: "asc",
//         },
//       },
//     });

//     // Only active modules
//     const allowedModules = propertyModules
//       .filter((item) => item.module.isActive)
//       .map((item) => item.module.code);

//     // -----------------------------
//     // 6. JWT secret
//     // -----------------------------

//     const JWT_SECRET = process.env.JWT_SECRET;

//     if (!JWT_SECRET) {
//       console.error("JWT_SECRET is missing");

//       return NextResponse.json(
//         {
//           error: "Server authentication configuration is missing",
//         },
//         { status: 500 }
//       );
//     }

//     // -----------------------------
//     // 7. Create client token
//     // -----------------------------

//     const token = jwt.sign(
//       {
//         id: user.id,
//         propertyId: property.id,
//         propertyCode: property.code,
//         email: user.email,
//         role: user.role,
//       },
//       JWT_SECRET,
//       {
//         expiresIn: "7d",
//       }
//     );

//     // -----------------------------
//     // 8. Create response
//     // -----------------------------

//     const response = NextResponse.json({
//       message: "Login successful",

//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role,

//         propertyId: property.id,
//         propertyCode: property.code,
//         propertyName: property.name,

//         allowedModules,
//       },

//       property: {
//         id: property.id,
//         code: property.code,
//         name: property.name,
//         address: property.address,
//       },
//     });

//     // -----------------------------
//     // 9. Set authentication cookie
//     // -----------------------------

//     response.cookies.set("clientToken", token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "strict",
//       path: "/",
//       maxAge: 7 * 24 * 60 * 60,
//     });

//     return response;
//   } catch (error) {
//     console.error("Client login error:", error);

//     return NextResponse.json(
//       {
//         error: "Something went wrong during login",
//       },
//       { status: 500 }
//     );
//   }
// }