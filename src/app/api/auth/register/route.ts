import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  successResponse,
  errorResponse,
  validationError,
} from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, inviteToken } = body;

    // ---- Validation ----
    if (!email || typeof email !== "string") {
      return validationError("Email is required");
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return validationError("Password must be at least 8 characters");
    }
    if (!fullName || typeof fullName !== "string" || fullName.trim().length === 0) {
      return validationError("Full name is required");
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ---- Check for existing user ----
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return errorResponse("EMAIL_EXISTS", "A user with this email already exists", 409);
    }

    // ---- Resolve invite token (optional) ----
    let invitedById: string | null = null;
    if (inviteToken && typeof inviteToken === "string") {
      // inviteToken is expected to be the inviting user's ID
      const inviter = await prisma.user.findUnique({
        where: { id: inviteToken },
      });
      if (inviter) {
        invitedById = inviter.id;
      }
    }

    // ---- Hash password ----
    const passwordHash = await bcrypt.hash(password, 12);

    // ---- Create user and profile in a transaction ----
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: "member",
          status: "active",
          invitedById,
          lastLoginAt: new Date(),
        },
      });

      // Create the empty member profile with fullName
      await tx.memberProfile.create({
        data: {
          userId: newUser.id,
          fullName: fullName.trim(),
        },
      });

      // Log the login activity
      await tx.activityLog.create({
        data: {
          userId: newUser.id,
          actionType: "login",
          details: { method: "registration" },
        },
      });

      return newUser;
    });

    // Return user without passwordHash
    return successResponse(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
      },
      201,
    );
  } catch (error) {
    console.error("[POST /api/auth/register] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to register user", 500);
  }
}
