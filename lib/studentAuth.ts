import { decodeStudentToken } from "./studentToken";
import { refreshAccessToken } from "./google/oauth";

/** 학생 라우트 공용: 링크의 암호화 토큰을 그 요청 순간에만 access_token으로 교환한다. */
export async function resolveStudentToken(
  token: string
): Promise<{ accessToken: string; spreadsheetId: string }> {
  const payload = decodeStudentToken(token); // 위조/만료된 토큰이면 여기서 예외
  const accessToken = await refreshAccessToken(payload.refreshToken);
  return { accessToken, spreadsheetId: payload.spreadsheetId };
}
