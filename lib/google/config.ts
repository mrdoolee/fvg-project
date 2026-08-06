function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`환경변수 ${name}가 설정되지 않았습니다.`);
  return value;
}

// drive.file: 앱이 만들거나 Picker로 사용자가 직접 연 파일에만 접근하는 "비민감" 스코프.
// spreadsheets 같은 전체 스코프는 절대 쓰지 않는다 — 앱 검증 심사/테스터 100명 상한을
// 피하기 위한 의도적인 선택 (docs/handoff/MIGRATION_BRIEF.md 참고).
export const GOOGLE_OAUTH_SCOPES = ["https://www.googleapis.com/auth/drive.file"];

export function getGoogleClientId(): string {
  return required("GOOGLE_CLIENT_ID");
}

export function getGoogleClientSecret(): string {
  return required("GOOGLE_CLIENT_SECRET");
}

export function getGoogleRedirectUri(): string {
  return required("GOOGLE_OAUTH_REDIRECT_URI");
}
