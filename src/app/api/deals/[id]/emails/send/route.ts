import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  successResponse,
  errorResponse,
  validationError,
  unauthorizedError,
  notFoundError,
  forbiddenError,
} from "@/lib/api-response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();

    const { id: dealId } = await params;
    const body = await request.json();
    const { emailId } = body;

    if (!emailId || typeof emailId !== "string") {
      return validationError("emailId is required");
    }

    // Verify deal ownership
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      select: { id: true, userId: true, brokerEmail: true },
    });

    if (!deal) return notFoundError("Deal not found");
    if (deal.userId !== session.user.id && session.user.role !== "admin") {
      return forbiddenError();
    }

    // Fetch the email
    const email = await prisma.emailGenerated.findUnique({
      where: { id: emailId },
    });

    if (!email) return notFoundError("Email not found");
    if (email.dealId !== dealId) {
      return validationError("Email does not belong to this deal");
    }
    if (email.status === "sent") {
      return errorResponse("ALREADY_SENT", "This email has already been sent", 409);
    }

    // Determine the recipient email
    const sentToEmail = deal.brokerEmail ?? null;

    // Update email status
    // In production, this would integrate with an email sending service.
    // For now, we mark it as sent and record the timestamp.
    const updatedEmail = await prisma.emailGenerated.update({
      where: { id: emailId },
      data: {
        status: "sent",
        sentAt: new Date(),
        sentToEmail: sentToEmail,
      },
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        dealId: dealId,
        actionType: "email_sent",
        details: {
          emailId: emailId,
          emailType: email.emailType,
          sentToEmail: sentToEmail,
          subject: email.subject,
        },
      },
    });

    return successResponse(updatedEmail);
  } catch (error) {
    console.error("[POST /api/deals/[id]/emails/send] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to send email", 500);
  }
}
