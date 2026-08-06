export default function Home() {
  return (
    <div className="app-shell">
      <div className="brand">
        <span className="dot" />
        <span>Flashcard Voice Game System</span>
      </div>
      <div className="card">
        <h1 className="title">Flashcard Voice Game</h1>
        <p className="subtitle">
          화면에 나온 단어를 정확히 발음하면 자동으로 채점됩니다.
        </p>
        <p className="mode-desc">뼈대 배포 확인용 페이지 — 교사 로그인/학생 화면은 이후 단계에서 구현됩니다.</p>
      </div>
      <div className="footer-note">© 2026 Designed &amp; Developed by 두리쌤. All rights reserved.</div>
    </div>
  );
}
