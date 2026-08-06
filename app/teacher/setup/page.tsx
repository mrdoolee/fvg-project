"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AboutButton from "../AboutButton";

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

type Stage = "checking" | "ready" | "working" | "done" | "error";

export default function TeacherSetupPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("checking");
  const [errorMessage, setErrorMessage] = useState("");
  const [studentLink, setStudentLink] = useState("");
  const [copyLabel, setCopyLabel] = useState("링크 복사");
  const accessTokenRef = useRef<string>("");

  useEffect(() => {
    fetch("/api/teacher/access-token")
      .then((res) => {
        if (!res.ok) throw new Error("세션이 만료되었습니다. 다시 로그인해주세요.");
        return res.json() as Promise<{ accessToken: string }>;
      })
      .then((data) => {
        accessTokenRef.current = data.accessToken;
        setStage("ready");
      })
      .catch(() => {
        router.replace("/teacher");
      });
  }, [router]);

  async function finishWithSpreadsheet(spreadsheetId: string) {
    setStage("working");
    try {
      const res = await fetch("/api/teacher/sheet/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId }),
      });
      if (!res.ok) throw new Error("학생용 링크 생성에 실패했습니다.");
      const data = (await res.json()) as { link: string };
      setStudentLink(data.link);
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
            setStage("ready");
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
        <span>Flashcard Voice Game System</span>
        <AboutButton />
      </div>
      <div className="card">
        <h1 className="title">시트 준비</h1>
        <p className="subtitle">
          학생명부·문항을 관리할 스프레드시트를 새로 만들거나, 이미 갖고 있는 시트를 선택하세요.
        </p>

        {stage === "checking" ? <p className="mode-desc">로그인 확인 중...</p> : null}

        {stage === "error" ? <div className="error-box show">{errorMessage}</div> : null}

        {stage === "ready" || stage === "error" ? (
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
            <div className="leaderboard-box">
              <p className="lb-title">🎉 학생용 링크가 준비됐습니다</p>
              <p style={{ wordBreak: "break-all", fontSize: "13px" }}>{studentLink}</p>
            </div>
            <button className="btn btn-primary" onClick={handleCopy}>
              {copyLabel}
            </button>
          </>
        ) : null}
      </div>
      <div className="footer-note">© 2026 Designed &amp; Developed by 두리쌤. All rights reserved.</div>
    </div>
  );
}
