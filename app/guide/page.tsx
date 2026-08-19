import Link from "next/link";

export default function GuidePage() {
  return (
    <div className="app-shell">
      <div className="brand" style={{ display: "flex", alignItems: "center" }}>
        <span className="dot" />
        <span>Flashcard Voice Game Maker</span>
        <Link
          href="/"
          style={{ marginLeft: "auto", fontSize: "13px", color: "var(--ink-soft)" }}
        >
          ← 대시보드로
        </Link>
      </div>

      <div className="card">
        <h1 className="title">📘 사용 메뉴얼</h1>
        <p className="subtitle">
          시트를 어떻게 채우고 학생에게 어떻게 배포하는지 정리했습니다.
        </p>

        <p className="field-label">1. 시작하기</p>
        <p className="mode-desc" style={{ margin: "0 0 20px" }}>
          대시보드에서 구글로 로그인 → &quot;빈 템플릿 자동 생성&quot; 또는 &quot;내 드라이브에서
          기존 시트 선택&quot; → 학생용 링크가 뜨면 &quot;스프레드시트 열기&quot;로 넘어가서
          아래 내용을 채운 다음, 링크를 학생들에게 배포하세요.
        </p>

        <p className="field-label">2. 학생명부 탭</p>
        <p className="mode-desc" style={{ margin: "0 0 20px" }}>
          <code>학년 | 반 | id(학번) | name(이름)</code> 순서로 입력합니다. 학생은 화면에서
          학년→반→이름 순으로 좁혀가며 본인을 선택합니다. id가 비어있는 행은 무시됩니다.
        </p>

        <p className="field-label">3. 데이터 탭 (문항)</p>
        <p className="mode-desc" style={{ margin: "0 0 4px" }}>
          <code>question | answers | timeLimit | unit | lang</code> 순서로 입력합니다.
        </p>
        <ul style={{ fontSize: "13.5px", color: "var(--ink-soft)", lineHeight: 1.7, margin: "0 0 20px", paddingLeft: "18px" }}>
          <li><b>answers</b>: 정답이 여러 개면 쉼표로 구분 (예: 사과,애플)</li>
          <li><b>timeLimit</b>: 채점 모드에서 문항당 제한시간(초). 비우면 5초. 시간측정 모드에선 쓰이지 않습니다.</li>
          <li><b>unit</b>: 단원명. 하나라도 채우면 학생 화면에 &quot;단원 선택&quot; 드롭다운이 자동으로 나타납니다. 전부 비우면 드롭다운 없이 전체 문항에서 출제됩니다.</li>
          <li><b>lang</b>: 인식 언어(예: ko-KR, en-US). 비우면 ko-KR. 문항마다 다르게 섞어 써도 됩니다.</li>
          <li>question 셀 안에서 Alt+Enter로 줄바꿈하면 학생 화면에 그대로 반영됩니다.</li>
        </ul>

        <p className="field-label">4. 환경설정 탭 (선택)</p>
        <p className="mode-desc" style={{ margin: "0 0 20px" }}>
          <code>BRAND_TEXT</code> / <code>APP_TITLE</code> / <code>APP_SUBTITLE</code> 값을
          채우면 학생 화면 상단 문구를 바꿀 수 있습니다. 비워두면 기본 문구가 쓰입니다.{" "}
          <code>MIC_PAGE_URL</code> / <code>MIC_PAGE_ORIGIN</code> / <code>STUDENT_LINK</code>는
          앱이 자동으로 관리하니 직접 수정하지 않는 걸 권장합니다.
        </p>

        <p className="field-label">5. 기록 탭</p>
        <p className="mode-desc" style={{ margin: "0" }}>
          학생 응시 결과가 자동으로 쌓입니다. 직접 입력할 필요 없고, 열 순서를 바꾸면 리더보드
          계산이 깨지니 주의하세요.
        </p>
      </div>

      <div className="card">
        <h1 className="title" style={{ fontSize: "18px" }}>
          6. 채점 모드 vs 시간측정 모드
        </h1>
        <ul style={{ fontSize: "13.5px", color: "var(--ink-soft)", lineHeight: 1.7, margin: "0", paddingLeft: "18px" }}>
          <li><b>채점 모드</b>: 문항별 제한시간 안에 맞히면 정답, 시간 초과 시 오답 처리 후 다음 문항으로 넘어갑니다.</li>
          <li><b>시간측정 모드</b>: 제한시간 없이 맞을 때까지 계속 시도하고, 전체 문항을 끝내는 데 걸린 시간을 기록합니다. 같은 단원 + 같은 문항 수로 응시한 기록 중 가장 빠른 3건이 결과 화면에 표시됩니다(이름은 표시되지 않습니다).</li>
        </ul>
      </div>

      <div className="card">
        <h1 className="title" style={{ fontSize: "18px" }}>
          7. 학생에게 링크와 함께 안내할 내용
        </h1>
        <div className="checklist" style={{ marginBottom: 0 }}>
          <ul>
            <li>Chrome 또는 Safari로 접속 (카카오톡·인스타그램 인앱 브라우저 금지)</li>
            <li>아이패드·아이폰은 반드시 Safari 사용</li>
            <li>새 창(팝업)이 열리면 마이크 권한을 [허용]</li>
            <li>마이크로소프트 엣지는 열리긴 하지만 자체 음성인식 서버를 써서 한글 인식률이 크롬보다 많이 떨어짐 — 되도록 피하고 크롬 사용 권장</li>
            <li>네이버 웨일·오페라·삼성 브라우저는 크로미움 기반이라도 구글의 음성인식 서버가 연결돼있지 않아 인식이 항상 실패합니다 (앱 문제가 아니라 브라우저 자체 한계)</li>
          </ul>
        </div>
      </div>

      <div className="card">
        <h1 className="title" style={{ fontSize: "18px" }}>
          8. 링크 관리
        </h1>
        <p className="mode-desc" style={{ margin: "0" }}>
          같은 시트를 다시 연결하면 이전에 만든 링크를 그대로 보여줍니다. &quot;새 링크로
          재발급&quot;을 누르면 새 링크가 만들어지지만, 이전 링크도 계속 유효하게 남아있습니다
          (자동으로 무효화되지 않습니다). 완전히 막고 싶다면 구글 계정 &gt; 보안 &gt; 타사 앱 및
          서비스에서 이 앱 권한 자체를 취소해야 합니다.
        </p>
      </div>

      <div className="footer-note">
        문의: Instagram trdoolee · © 2026 Designed &amp; Developed by 두리쌤. All rights reserved.
      </div>
    </div>
  );
}
