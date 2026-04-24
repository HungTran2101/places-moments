import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchWeatherAtmosphere } from "@/lib/weather";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";
import { constants } from "../constant";

const CreateSubmissionSchema = z.object({
  // title: z.string().min(1).max(120),
  description: z.string().min(1).max(constants.MAX_DESCRIPTION_LENGTH),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  author_uuid: z.uuid(),
});

// GET /api/submissions - list all public submissions
export async function GET() {
  try {
    const submissions = await prisma.submission.findMany({
      select: {
        id: true,
        description: true,
        lat: true,
        lng: true,
        weather_summary: true,
        weather_code: true,
        // Do NOT expose: created_at, author_uuid (public view)
      },
      orderBy: { created_at: "desc" },
      take: 500,
    });

    return NextResponse.json(submissions);
  } catch {
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}

// POST /api/submissions - create a new submission
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { maxRequests: 10, windowMs: 0 });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 422 });
  }

  const { description, lat, lng, author_uuid } = parsed.data;

  const { summary, code } = await fetchWeatherAtmosphere(lat, lng);

  const submission = await prisma.submission.create({
    data: {
      // title,
      description,
      lat,
      lng,
      weather_summary: summary,
      weather_code: code,
      author_uuid,
    },
  });

  return NextResponse.json(submission, { status: 201 });
}
