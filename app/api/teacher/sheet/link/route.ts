import { NextRequest, NextResponse } from "next/server";
import { encryptJson } from "@/lib/crypto";
import { getConfig } from "@/lib/appData";
import { refreshAccessToken } from "@/lib/google/oauth";
import { upsertEnvConfig } from "@/lib/google/envConfig";
import { readTeacherSession } from "@/lib/teacherSession";
import type { StudentLinkPayload } from "@/lib/studentToken";

const STUDENT_LINK_KEY = "STUDENT_LINK";

export async function POST(req: NextRequest) {
  const session = readTeacherSession(req);
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    spreadsheetId?: string;
    regenerate?: boolean;
  };
  if (!body.spreadsheetId) {
    return NextResponse.json(
      { error: "spreadsheetId가 필요합니다." },
      { status: 400 }
    );
  }
  const { spreadsheetId } = body;

  const accessToken = await refreshAccessToken(session.refreshToken);

  // 이미 이 시트에 발급해둔 링크가 있으면(그리고 강제 재발급이 아니면) 그대로 재사용 —
  // 예전 링크의 refresh_token은 여전히 유효하므로 새로 만들 필요가 없다.
  if (!body.regenerate) {
    const config = await getConfig(accessToken, spreadsheetId);
    const existingLink = config[STUDENT_LINK_KEY];
    if (existingLink) {
      return NextResponse.json({
        link: existingLink,
        spreadsheetId,
        reused: true,
      });
    }
  }

  const payload: StudentLinkPayload = {
    spreadsheetId,
    refreshToken: session.refreshToken,
  };
  const token = encryptJson(payload);
  const link = new URL(`/play?token=${token}`, req.nextUrl.origin).toString();

  await upsertEnvConfig(accessToken, spreadsheetId, STUDENT_LINK_KEY, link);

  return NextResponse.json({ link, spreadsheetId, reused: false });
}
