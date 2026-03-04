import { NextResponse } from "next/server";

// Login is handled by NextAuth's CredentialsProvider.
// This endpoint redirects clients to the NextAuth signIn URL.
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: {
        code: "USE_NEXTAUTH",
        message:
          "Login is handled by NextAuth. POST to /api/auth/callback/credentials with { email, password } or use the signIn() client helper.",
      },
    },
    { status: 307, headers: { Location: "/api/auth/signin" } },
  );
}
