import { NextRequest, NextResponse } from "next/server";
import { encryptJson } from "@/lib/crypto";
import { readTeacherSession } from "@/lib/teacherSession";
import type { StudentLinkPayload } from "@/lib/studentToken";

export async function POST(req: NextRequest) {
  const session = readTeacherSession(req);
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    spreadsheetId?: string;
  };
  if (!body.spreadsheetId) {
    return NextResponse.json(
      { error: "spreadsheetId가 필요합니다." },
      { status: 400 }
    );
  }

  const payload: StudentLinkPayload = {
    spreadsheetId: body.spreadsheetId,
    refreshToken: session.refreshToken,
  };
  const token = encryptJson(payload);
  const link = new URL(`/play?token=${token}`, req.nextUrl.origin).toString();

  return NextResponse.json({ link, spreadsheetId: body.spreadsheetId });
}
