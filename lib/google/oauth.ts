import { OAuth2Client, type Credentials } from "google-auth-library";
import {
  GOOGLE_OAUTH_SCOPES,
  getGoogleClientId,
  getGoogleClientSecret,
  getGoogleRedirectUri,
} from "./config";

function createOAuthClient(): OAuth2Client {
  return new OAuth2Client(
    getGoogleClientId(),
    getGoogleClientSecret(),
    getGoogleRedirectUri()
  );
}

/** 교사를 구글 동의 화면으로 보낼 URL. state로 CSRF 방지용 랜덤값을 받는다. */
export function buildGoogleAuthUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline", // refresh_token을 받기 위해 필수
    prompt: "consent", // 매번 동의 화면을 띄워 refresh_token 재발급을 보장
    scope: GOOGLE_OAUTH_SCOPES,
    state,
  });
}

/** 콜백에서 받은 code를 access_token/refresh_token으로 교환 */
export async function exchangeCodeForTokens(code: string): Promise<Credentials> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

/** refresh_token으로 새 access_token 발급 (Sheets API 호출 직전마다 사용) */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  if (!credentials.access_token) {
    throw new Error("access_token 발급에 실패했습니다.");
  }
  return credentials.access_token;
}
