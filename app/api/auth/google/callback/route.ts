import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/google/oauth";
import { encryptJson } from "@/lib/crypto";
import {
  OAUTH_STATE_COOKIE,
  TEACHER_SESSION_COOKIE,
  type TeacherSession,
} from "@/lib/teacherSession";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(
      new URL("/?error=invalid_state", url.origin)
    );
  }

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens.refresh_token) {
    // prompt=consent + access_type=offline로 항상 요청하므로 보통은 여기 안 옴.
    // 혹시 못 받았으면 구글 계정 > 보안 > 타사 앱 액세스에서 이 앱 권한을 취소하고
    // 다시 로그인해야 refresh_token이 재발급된다.
    return NextResponse.redirect(
      new URL("/?error=no_refresh_token", url.origin)
    );
  }

  const session: TeacherSession = { refreshToken: tokens.refresh_token };
  const res = NextResponse.redirect(new URL("/", url.origin));
  res.cookies.set(TEACHER_SESSION_COOKIE, encryptJson(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 설정 흐름용 세션 — 1시간이면 충분
  });
  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}
