import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";

const CreateFutureMessageSchema = z.object({
  author_uuid: z.string().uuid(),
  message: z.string().min(1).max(1000),
  unlock_condition: z.enum(["after_days:30", "after_days:90", "after_days:365", "random"]),
});

// GET /api/future-message — author fetches their own future messages
export async function GET(request: NextRequest) {
  const author_uuid = request.headers.get("x-author-uuid");
  if (!author_uuid) {
    return NextResponse.json({ error: "Missing author identity" }, { status: 400 });
  }

  const messages = await prisma.futureMessage.findMany({
    where: { author_uuid },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json(messages);
}

// POST /api/future-message — create a new future message
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { maxRequests: 2, windowMs: 60_000 });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateFutureMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 422 });
  }

  const { author_uuid, message, unlock_condition } = parsed.data;

  const futureMessage = await prisma.futureMessage.create({
    data: { author_uuid, message, unlock_condition },
  });

  return NextResponse.json(futureMessage, { status: 201 });
}
