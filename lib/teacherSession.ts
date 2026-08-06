import type { NextRequest } from "next/server";
import { decryptJson } from "./crypto";

export const TEACHER_SESSION_COOKIE = "fvg_teacher_session";
export const OAUTH_STATE_COOKIE = "fvg_oauth_state";

/**
 * 교사 세션엔 refresh_token만 담는다. access_token은 필요할 때마다 이걸로 새로 발급받는다
 * (짧은 설정 흐름 동안만 쓰는 세션이라 캐시할 필요가 없고, 코드가 더 단순해진다).
 */
export interface TeacherSession {
  refreshToken: string;
}

export function readTeacherSession(req: NextRequest): TeacherSession | null {
  const raw = req.cookies.get(TEACHER_SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return decryptJson<TeacherSession>(raw);
  } catch {
    return null; // 위조되었거나 만료된 쿠키
  }
}
