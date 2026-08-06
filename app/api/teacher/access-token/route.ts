import { NextRequest, NextResponse } from "next/server";
import { refreshAccessToken } from "@/lib/google/oauth";
import { readTeacherSession } from "@/lib/teacherSession";

/** Picker는 브라우저에서 직접 access_token이 필요하므로 세션의 refresh_token으로 그때그때 발급 */
export async function GET(req: NextRequest) {
  const session = readTeacherSession(req);
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const accessToken = await refreshAccessToken(session.refreshToken);
  return NextResponse.json({ accessToken });
}
