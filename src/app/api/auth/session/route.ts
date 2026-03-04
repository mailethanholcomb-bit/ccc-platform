import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { successResponse, unauthorizedError } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return unauthorizedError();
    }

    return successResponse({
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        status: session.user.status,
      },
    });
  } catch (error) {
    console.error("[GET /api/auth/session] Error:", error);
    return unauthorizedError();
  }
}
