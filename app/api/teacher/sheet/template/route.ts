import { NextRequest, NextResponse } from "next/server";
import { refreshAccessToken } from "@/lib/google/oauth";
import { createTemplateSpreadsheet } from "@/lib/google/template";
import { readTeacherSession } from "@/lib/teacherSession";

export async function POST(req: NextRequest) {
  const session = readTeacherSession(req);
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { title?: string };
  const title = body.title?.trim() || "Flashcard Voice Game";

  const accessToken = await refreshAccessToken(session.refreshToken);
  const spreadsheetId = await createTemplateSpreadsheet(accessToken, title);

  return NextResponse.json({ spreadsheetId });
}
