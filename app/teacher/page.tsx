import AboutButton from "./AboutButton";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "로그인 요청이 만료되었거나 위조되었습니다. 다시 시도해주세요.",
  no_refresh_token:
    "구글 계정 접근 권한을 새로 받지 못했습니다. 구글 계정 > 보안 > 타사 앱 액세스에서 이 앱 권한을 취소한 뒤 다시 로그인해주세요.",
};

export default async function TeacherLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;

  return (
    <div className="app-shell">
      <div className="brand" style={{ display: "flex", alignItems: "center" }}>
        <span className="dot" />
        <span>Flashcard Voice Game System</span>
        <AboutButton />
      </div>
      <div className="card">
        <h1 className="title">교사용 로그인</h1>
        <p className="subtitle">
          구글 계정으로 로그인해서 본인 소유의 시트를 선택하거나 새로 만드세요.
          이 앱은 여러분이 직접 선택/생성한 시트에만 접근합니다.
        </p>
        {errorMessage ? (
          <div className="error-box show">{errorMessage}</div>
        ) : null}
        <a className="btn btn-primary" href="/api/auth/google">
          구글로 로그인
        </a>
      </div>
      <div className="footer-note">© 2026 Designed &amp; Developed by 두리쌤. All rights reserved.</div>
    </div>
  );
}
