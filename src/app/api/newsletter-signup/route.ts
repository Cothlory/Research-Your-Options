// CORE LOGIC - avoid editing unless assigned

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";

const SignupSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = SignupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
  }

  const subscriber = await prisma.studentSubscriber.upsert({
    where: { email: parsed.data.email.toLowerCase() },
    create: {
      email: parsed.data.email.toLowerCase(),
      isActive: true,
    },
    update: {
      isActive: true,
      unsubscribedAt: null,
    },
  });

  return NextResponse.json({ ok: true, subscriberId: subscriber.id });
}
