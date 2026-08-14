"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import AboutButton from "./AboutButton";

declare global {
  interface Window {
    // Google Picker API는 공식 TS 타입 배포가 없어 필요한 만큼만 최소로 선언한다.
    gapi?: { load: (api: string, cb: () => void) => void };
    google?: {
      picker: {
        PickerBuilder: new () => GooglePickerBuilder;
        ViewId: { SPREADSHEETS: unknown };
        Action: { PICKED: string };
      };
    };
  }
}

interface GooglePickerDoc {
  id: string;
  name: string;
}
interface GooglePickerData {
  action: string;
  docs?: GooglePickerDoc[];
}
interface GooglePickerBuilder {
  addView: (view: unknown) => GooglePickerBuilder;
  setOAuthToken: (token: string) => GooglePickerBuilder;
  setDeveloperKey: (key: string) => GooglePickerBuilder;
  setCallback: (cb: (data: GooglePickerData) => void) => GooglePickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
}

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`스크립트 로드 실패: ${src}`));
    document.head.appendChild(script);
  });
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "로그인 요청이 만료되었거나 위조되었습니다. 다시 시도해주세요.",
  no_refresh_token:
    "구글 계정 접근 권한을 새로 받지 못했습니다. 구글 계정 > 보안 > 타사 앱 액세스에서 이 앱 권한을 취소한 뒤 다시 로그인해주세요.",
};

type Stage = "checking" | "login" | "setup" | "working" | "done" | "error";

function TeacherDashboard() {
  const [stage, setStage] = useState<Stage>("checking");
  const [loginError] = useState(() => {
    if (typeof window === "undefined") return "";
    const err = new URLSearchParams(window.location.search).get("error");
    return err ? ERROR_MESSAGES[err] ?? "로그인 중 오류가 발생했습니다." : "";
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [studentLink, setStudentLink] = useState("");
  const [linkReused, setLinkReused] = useState(false);
  const [copyLabel, setCopyLabel] = useState("링크 복사");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const accessTokenRef = useRef<string>("");

  useEffect(() => {
    fetch("/api/teacher/access-token")
      .then((res) => {
        if (!res.ok) throw new Error("no session");
        return res.json() as Promise<{ accessToken: string }>;
      })
      .then((data) => {
        accessTokenRef.current = data.accessToken;
        setStage("setup");
      })
      .catch(() => {
        setStage("login");
      });
  }, []);

  async function finishWithSpreadsheet(id: string, regenerate = false) {
    setStage("working");
    setSpreadsheetId(id);
    try {
      const res = await fetch("/api/teacher/sheet/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId: id, regenerate }),
      });
      if (!res.ok) throw new Error("학생용 링크 생성에 실패했습니다.");
      const data = (await res.json()) as { link: string; reused: boolean };
      setStudentLink(data.link);
      setLinkReused(data.reused);
      setStage("done");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "알 수 없는 오류");
      setStage("error");
    }
  }

  async function handleCreateTemplate() {
    setStage("working");
    try {
      const res = await fetch("/api/teacher/sheet/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("빈 템플릿 생성에 실패했습니다.");
      const data = (await res.json()) as { spreadsheetId: string };
      await finishWithSpreadsheet(data.spreadsheetId);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "알 수 없는 오류");
      setStage("error");
    }
  }

  async function handleOpenPicker() {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (!apiKey) {
      setErrorMessage("NEXT_PUBLIC_GOOGLE_API_KEY가 설정되지 않았습니다.");
      setStage("error");
      return;
    }
    setStage("working");
    try {
      await loadScriptOnce("https://apis.google.com/js/api.js");
      await new Promise<void>((resolve) => window.gapi!.load("picker", resolve));

      const picker = new window.google!.picker
        .PickerBuilder()
        .addView(window.google!.picker.ViewId.SPREADSHEETS)
        .setOAuthToken(accessTokenRef.current)
        .setDeveloperKey(apiKey)
        .setCallback((data: GooglePickerData) => {
          if (data.action === window.google!.picker.Action.PICKED && data.docs?.[0]) {
            finishWithSpreadsheet(data.docs[0].id);
          } else if (data.action === "cancel") {
            setStage("setup");
          }
        })
        .build();
      picker.setVisible(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Picker를 여는 중 오류가 발생했습니다.");
      setStage("error");
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(studentLink).then(() => {
      setCopyLabel("복사됨!");
      setTimeout(() => setCopyLabel("링크 복사"), 1500);
    });
  }

  return (
    <div className="app-shell">
      <div className="brand" style={{ display: "flex", alignItems: "center" }}>
        <span className="dot" />
        <span>Flashcard Voice Game Maker</span>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginLeft: "auto" }}>
          <a
            href="/guide"
            aria-label="이용 안내"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--ink-soft)",
              textDecoration: "none",
              border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "6px 12px",
            }}
          >
            📘 사용 메뉴얼
          </a>
          <AboutButton />
        </div>
      </div>

      {stage === "login" ? (
        <div className="card" style={{ marginBottom: "20px" }}>
          <h1 className="title" style={{ fontSize: "18px" }}>
            🎙️ Flashcard Voice Game이 뭔가요?
          </h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            화면에 나온 단어나 문장을 학생이 소리 내어 말하면, 브라우저가 자동으로 듣고
            정답 여부를 판정합니다. 결과는 선생님의 구글 시트에 자동으로 기록되고, 학생은
            로그인 없이 링크만 열면 바로 응시할 수 있습니다. 이 페이지(Maker)는 선생님이
            시트를 준비하고 그 학생용 링크를 발급받는 곳입니다.
          </p>
        </div>
      ) : null}

      {stage === "login" ? (
        <div className="card">
          <h1 className="title">교사용 로그인</h1>
          <p className="subtitle">
            구글 계정으로 로그인해서 본인 소유의 시트를 선택하거나 새로 만드세요.
            이 앱은 여러분이 직접 선택/생성한 시트에만 접근합니다.
          </p>
          {loginError ? <div className="error-box show">{loginError}</div> : null}
          <a className="btn btn-primary" href="/api/auth/google">
            구글로 로그인
          </a>
        </div>
      ) : null}

      {stage !== "login" ? (
        <div className="card">
          <h1 className="title">시트 준비</h1>
          <p className="subtitle">
            학생명부·문항을 관리할 스프레드시트를 새로 만들거나, 이미 갖고 있는 시트를 선택하세요.
          </p>

          {stage === "checking" ? <p className="mode-desc">로그인 확인 중...</p> : null}

          {stage === "error" ? <div className="error-box show">{errorMessage}</div> : null}

          {stage === "setup" || stage === "error" ? (
            <>
              <button className="btn btn-primary" onClick={handleCreateTemplate}>
                빈 템플릿 자동 생성
              </button>
              <button className="btn btn-ghost" onClick={handleOpenPicker}>
                내 드라이브에서 기존 시트 선택
              </button>
            </>
          ) : null}

          {stage === "working" ? <p className="mode-desc">처리 중...</p> : null}

          {stage === "done" ? (
            <>
              <a
                className="btn btn-primary"
                href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
              >
                📄 스프레드시트 열기
              </a>
              <p style={{ fontSize: "12.5px", color: "var(--ink-soft)", lineHeight: 1.5, margin: "18px 0 24px" }}>
                시트에 가서 설정을 마무리한 후, 학생용 링크를 배포하세요.
              </p>

              <div className="leaderboard-box">
                <p className="lb-title">
                  {linkReused
                    ? "🎉 예전에 만든 링크를 그대로 보여드려요"
                    : "🎉 학생용 링크가 준비됐습니다"}
                </p>
                <p style={{ wordBreak: "break-all", fontSize: "13px" }}>{studentLink}</p>
              </div>
              <button className="btn btn-primary" onClick={handleCopy}>
                {copyLabel}
              </button>
              {linkReused ? (
                <button
                  className="btn btn-ghost"
                  onClick={() => finishWithSpreadsheet(spreadsheetId, true)}
                >
                  새 링크로 재발급
                </button>
              ) : null}
              <button className="btn btn-ghost" onClick={() => setStage("setup")}>
                다른 시트 연결하기
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="footer-note">© 2026 Designed &amp; Developed by 두리쌤. All rights reserved.</div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <TeacherDashboard />
    </Suspense>
  );
}
