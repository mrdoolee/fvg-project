import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { buildGoogleAuthUrl } from "@/lib/google/oauth";
import { OAUTH_STATE_COOKIE } from "@/lib/teacherSession";

export async function GET() {
  const state = crypto.randomBytes(16).toString("base64url");
  const authUrl = buildGoogleAuthUrl(state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 동의 화면에서 머무를 수 있는 시간(10분)이면 충분
  });
  return res;
}
