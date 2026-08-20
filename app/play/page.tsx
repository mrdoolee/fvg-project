"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import FooterCredit from "../FooterCredit";

interface Student {
  grade: string;
  classNo: string;
  id: string;
  name: string;
}
interface QuizItem {
  qid: number;
  question: string;
  answers: string[];
  timeLimit: number;
  unit: string;
  lang: string;
}
interface Config {
  MIC_PAGE_URL?: string;
  MIC_PAGE_ORIGIN?: string;
  BRAND_TEXT?: string;
  APP_TITLE?: string;
  APP_SUBTITLE?: string;
  STUDENT_MODE?: string;
}

const ANONYMOUS_STUDENT = { id: "", name: "익명" };
type QuizResult =
  | { mode: "TIME"; totalCount: number; elapsedSeconds: number }
  | { mode: "SCORE"; correctCount: number; totalCount: number; wrongQuestions: string[] };

const MODE_DESC: Record<"SCORE" | "TIME", string> = {
  SCORE: "문항마다 제한시간 안에 맞히면 정답, 못 맞히면 오답으로 채점합니다.",
  TIME: "제한시간 없이, 맞힐 때까지 계속 시도합니다. 전체 문항을 끝내는 데 걸린 총 시간을 기록합니다.",
};

type View = "login" | "waiting" | "result";

function PlayPageInner() {
  const token = useSearchParams().get("token") ?? "";

  const [config, setConfig] = useState<Config>({});
  const [fullStudentList, setFullStudentList] = useState<Student[]>([]);
  const [units, setUnits] = useState<string[]>([]);

  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedClassNo, setSelectedClassNo] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);
  const [selectedMode, setSelectedMode] = useState<"SCORE" | "TIME">("SCORE");
  const [selectedCount, setSelectedCount] = useState(10);
  const [selectedUnit, setSelectedUnit] = useState("");

  const [view, setView] = useState<View>("login");
  const [errorMessage, setErrorMessage] = useState("");
  const [starting, setStarting] = useState(false);

  const [waitingText, setWaitingText] = useState("새 창에서 평가가 진행 중입니다...");
  const [showOpenPopupBtn, setShowOpenPopupBtn] = useState(true);
  const [showReopenBtn, setShowReopenBtn] = useState(false);
  const [showRetrySubmitBtn, setShowRetrySubmitBtn] = useState(false);
  const [showCancelBackBtn, setShowCancelBackBtn] = useState(false);

  const [resultView, setResultView] = useState<{
    isTime: boolean;
    score: number;
    correct: number;
    total: number;
    wrongQuestions: string[];
    elapsedSeconds: number;
    leaderboard: { elapsedSeconds: number }[];
  } | null>(null);

  // message 리스너/watchdog은 마운트 시 한 번만 등록되므로, 그 안에서 최신 값을 읽으려면
  // ref를 써야 한다 (원본 JavaScript.html의 전역 변수와 동등한 역할).
  const quizDataRef = useRef<{ quiz: QuizItem[] } | null>(null);
  const selectedStudentRef = useRef<{ id: string; name: string } | null>(null);
  const selectedModeRef = useRef<"SCORE" | "TIME">("SCORE");
  const selectedUnitRef = useRef("");
  const configRef = useRef<Config>({});
  const lastResultRef = useRef<QuizResult | null>(null);
  const popupRef = useRef<Window | null>(null);
  const popupWatchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const quizInProgressRef = useRef(false);

  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    selectedStudentRef.current = selectedStudent;
  }, [selectedStudent]);
  useEffect(() => {
    selectedModeRef.current = selectedMode;
  }, [selectedMode]);
  useEffect(() => {
    selectedUnitRef.current = selectedUnit;
  }, [selectedUnit]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/config?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data: Config) => setConfig(data))
      .catch(() => {});

    fetch(`/api/students?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data: { success: boolean; students?: Student[]; message?: string }) => {
        if (!data.success) {
          setErrorMessage(data.message || "학생 명단을 불러오지 못했습니다.");
          return;
        }
        setFullStudentList(data.students ?? []);
      })
      .catch(() => setErrorMessage("학생 명단을 불러오지 못했습니다."));

    fetch(`/api/units?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data: string[]) => setUnits(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [token]);

  // ROSTER(기본, 명단만) | ROSTER_AND_ANONYMOUS(명단+익명 버튼) | ANONYMOUS_ONLY(익명만) —
  // 값이 없거나 알 수 없으면 기존 동작(명단만)으로 안전하게 폴백한다.
  const studentMode =
    config.STUDENT_MODE === "ANONYMOUS_ONLY"
      ? "anonymous"
      : config.STUDENT_MODE === "ROSTER_AND_ANONYMOUS"
      ? "both"
      : "roster";
  const isAnonymousSelected = selectedStudent?.id === "" && selectedStudent?.name === "익명";

  const brandText = config.BRAND_TEXT || "Flashcard Voice Game System";
  const appTitle = config.APP_TITLE || "Flashcard Voice Game";
  const appSubtitle = config.APP_SUBTITLE || "화면에 나온 단어를 정확히 발음하면 자동으로 채점됩니다.";

  useEffect(() => {
    document.title = appTitle;
  }, [appTitle]);

  const grades = useMemo(() => {
    const list: string[] = [];
    fullStudentList.forEach((s) => {
      if (s.grade && !list.includes(s.grade)) list.push(s.grade);
    });
    return list.sort();
  }, [fullStudentList]);

  const classes = useMemo(() => {
    if (!selectedGrade) return [];
    const list: string[] = [];
    fullStudentList.forEach((s) => {
      if (s.grade === selectedGrade && !list.includes(s.classNo)) list.push(s.classNo);
    });
    return list.sort();
  }, [fullStudentList, selectedGrade]);

  const studentsInClass = useMemo(() => {
    if (!selectedClassNo) return [];
    return fullStudentList
      .filter((s) => s.grade === selectedGrade && s.classNo === selectedClassNo)
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [fullStudentList, selectedGrade, selectedClassNo]);

  function clearError() {
    setErrorMessage("");
  }

  async function handleStart() {
    clearError();
    if (!selectedStudent) {
      setErrorMessage(
        studentMode === "anonymous"
          ? "참여 버튼을 눌러주세요."
          : "명단에서 본인 이름을 선택해주세요."
      );
      return;
    }
    setStarting(true);
    try {
      const res = await fetch(
        `/api/quiz?token=${encodeURIComponent(token)}&count=${selectedCount || 999}&unit=${encodeURIComponent(
          selectedUnit
        )}`
      );
      const data = (await res.json()) as
        | { success: true; quiz: QuizItem[] }
        | { success: false; message?: string };
      if (!data.success) {
        setErrorMessage(data.message || "문항을 불러오지 못했습니다.");
        return;
      }
      quizDataRef.current = { quiz: data.quiz };
      setView("waiting");
    } catch {
      setErrorMessage("서버 오류가 발생했습니다.");
    } finally {
      setStarting(false);
    }
  }

  /* ---------- 팝업 오픈 (반드시 클릭 핸들러 내부에서 동기 호출) ---------- */
  function openMicPopup() {
    const micUrl = configRef.current.MIC_PAGE_URL;
    const micOrigin = configRef.current.MIC_PAGE_ORIGIN;
    if (!micUrl || !micOrigin) {
      setErrorMessage("환경설정 탭에 MIC_PAGE_URL / MIC_PAGE_ORIGIN 값이 없습니다. 시트를 확인해주세요.");
      return;
    }
    const popup = window.open(micUrl, "micQuiz", "width=480,height=840");
    if (!popup) {
      setShowReopenBtn(true);
      setErrorMessage("팝업이 차단되었습니다. 브라우저의 팝업 차단을 해제하고 다시 시도해주세요.");
      return;
    }
    popupRef.current = popup;
    quizInProgressRef.current = true;
    setWaitingText("팝업 창에서 마이크 권한을 허용해주세요...");
    setShowOpenPopupBtn(false);
    setShowReopenBtn(true);

    if (popupWatchdogRef.current) clearInterval(popupWatchdogRef.current);
    popupWatchdogRef.current = setInterval(() => {
      if (quizInProgressRef.current && popupRef.current && popupRef.current.closed) {
        if (popupWatchdogRef.current) clearInterval(popupWatchdogRef.current);
        quizInProgressRef.current = false;
        setErrorMessage("평가 창이 닫혔습니다. 결과가 저장되지 않았으니 다시 시작해주세요.");
        setShowOpenPopupBtn(true);
        setShowReopenBtn(false);
        setShowCancelBackBtn(true);
        setWaitingText("평가가 중단되었습니다.");
      }
    }, 1000);
  }

  async function submitFinalResult() {
    const result = lastResultRef.current;
    const student = selectedStudentRef.current;
    if (!result || !student) return;

    setShowRetrySubmitBtn(false);
    setShowCancelBackBtn(false);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          ...result,
          studentId: student.id,
          studentName: student.name,
          unit: selectedUnitRef.current,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMessage(data.message || "기록 저장에 실패했습니다.");
        setShowRetrySubmitBtn(true);
        return;
      }

      if (data.mode === "TIME") {
        setResultView({
          isTime: true,
          score: 0,
          correct: 0,
          total: 0,
          wrongQuestions: [],
          elapsedSeconds: data.elapsedSeconds,
          leaderboard: data.leaderboard ?? [],
        });
      } else {
        const wrongQuestions = result.mode === "SCORE" ? result.wrongQuestions : [];
        setResultView({
          isTime: false,
          score: data.score,
          correct: data.correct,
          total: data.total,
          wrongQuestions,
          elapsedSeconds: 0,
          leaderboard: [],
        });
      }
      setView("result");
    } catch {
      setErrorMessage("결과 저장 중 오류가 발생했습니다 — 답변은 보존되어 있으니 다시 제출해보세요.");
      setShowRetrySubmitBtn(true);
    }
  }

  /* ---------- 팝업(mic-page)과의 postMessage 통신 ---------- */
  useEffect(() => {
    function handleMessage(evt: MessageEvent) {
      const expectedOrigin = configRef.current.MIC_PAGE_ORIGIN;
      if (!expectedOrigin || evt.origin !== expectedOrigin) return;
      const data = evt.data || {};

      if (data.type === "READY") {
        popupRef.current?.postMessage(
          {
            type: "INIT",
            quiz: quizDataRef.current?.quiz ?? [],
            student: selectedStudentRef.current,
            mode: selectedModeRef.current,
            appTitle: configRef.current.APP_TITLE || "Flashcard Voice Game",
          },
          expectedOrigin
        );
        setWaitingText("평가가 진행 중입니다. 팝업 창을 확인해주세요.");
      }

      if (data.type === "DONE") {
        quizInProgressRef.current = false;
        if (popupWatchdogRef.current) clearInterval(popupWatchdogRef.current);
        lastResultRef.current = data.result;
        popupRef.current?.close();
        setWaitingText("결과를 저장하는 중입니다...");
        setShowReopenBtn(false);
        submitFinalResult();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetApp() {
    setSelectedStudent(null);
    setSelectedGrade("");
    setSelectedClassNo("");
    setSelectedMode("SCORE");
    setSelectedCount(10);
    setSelectedUnit("");
    quizDataRef.current = null;
    lastResultRef.current = null;
    popupRef.current = null;
    quizInProgressRef.current = false;
    if (popupWatchdogRef.current) clearInterval(popupWatchdogRef.current);

    clearError();
    setWaitingText("새 창에서 평가가 진행 중입니다...");
    setShowOpenPopupBtn(true);
    setShowReopenBtn(false);
    setShowRetrySubmitBtn(false);
    setShowCancelBackBtn(false);
    setResultView(null);
    setView("login");
  }

  const leaderboardTitle = selectedUnit ? `🏆 "${selectedUnit}" 단원 TOP 3` : "🏆 전체 범위 TOP 3";

  if (!token) {
    return (
      <div className="app-shell">
        <div className="card">
          <div className="error-box show">
            링크가 올바르지 않습니다. 선생님께 받은 링크를 다시 확인해주세요.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="brand">
        <span className="dot" />
        <span>{brandText}</span>
      </div>

      {errorMessage ? <div className="error-box show">{errorMessage}</div> : null}

      {view === "login" ? (
        <div className="view active">
          <div className="card">
            <h1 className="title">{appTitle}</h1>
            <p className="subtitle">{appSubtitle}</p>

            {studentMode !== "anonymous" ? (
              <>
                <p className="field-label">학년 선택</p>
                <select
                  className="select-box"
                  value={selectedGrade}
                  onChange={(e) => {
                    setSelectedGrade(e.target.value);
                    setSelectedClassNo("");
                    setSelectedStudent(null);
                  }}
                >
                  <option value="">-- 학년 선택 --</option>
                  {grades.map((g) => (
                    <option key={g} value={g}>
                      {g}학년
                    </option>
                  ))}
                </select>

                <p className="field-label">반 선택</p>
                <select
                  className="select-box"
                  disabled={!selectedGrade}
                  value={selectedClassNo}
                  onChange={(e) => {
                    setSelectedClassNo(e.target.value);
                    setSelectedStudent(null);
                  }}
                >
                  <option value="">
                    {selectedGrade ? "-- 반 선택 --" : "-- 먼저 학년을 선택하세요 --"}
                  </option>
                  {classes.map((c) => (
                    <option key={c} value={c}>
                      {c}반
                    </option>
                  ))}
                </select>

                <p className="field-label">이름 선택</p>
                <select
                  className="select-box"
                  disabled={!selectedClassNo}
                  value={isAnonymousSelected ? "" : selectedStudent?.id ?? ""}
                  onChange={(e) => {
                    const s = studentsInClass.find((st) => st.id === e.target.value);
                    setSelectedStudent(s ? { id: s.id, name: s.name } : null);
                  }}
                >
                  <option value="">
                    {selectedClassNo ? "-- 이름 선택 --" : "-- 먼저 반을 선택하세요 --"}
                  </option>
                  {studentsInClass.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              </>
            ) : null}

            {studentMode !== "roster" ? (
              <div style={{ margin: studentMode === "both" ? "-8px 0 24px" : "0 0 24px" }}>
                {studentMode === "both" ? (
                  <p className="mode-desc" style={{ margin: "0 0 10px" }}>또는</p>
                ) : (
                  <p className="field-label">참여 방법</p>
                )}
                <div
                  className={`chip${isAnonymousSelected ? " selected" : ""}`}
                  style={{ width: "100%" }}
                  onClick={() => setSelectedStudent({ ...ANONYMOUS_STUDENT })}
                >
                  {isAnonymousSelected ? "✓ 이름 없이 참여" : "이름 없이 참여하기"}
                </div>
              </div>
            ) : null}

            <p className="field-label">출제 방식 선택</p>
            <div className="chip-row">
              {(["SCORE", "TIME"] as const).map((m) => (
                <div
                  key={m}
                  className={`chip${selectedMode === m ? " selected" : ""}`}
                  onClick={() => setSelectedMode(m)}
                >
                  {m === "SCORE" ? "채점 모드" : "시간측정 모드"}
                </div>
              ))}
            </div>
            <p className="mode-desc">{MODE_DESC[selectedMode]}</p>

            {units.length > 0 ? (
              <div>
                <p className="field-label">단원 선택</p>
                <select
                  className="select-box"
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                >
                  <option value="">전체</option>
                  {units.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <p className="field-label">문항 수 선택</p>
            <div className="chip-row">
              {[5, 10, 20, 0].map((c) => (
                <div
                  key={c}
                  className={`chip${selectedCount === c ? " selected" : ""}`}
                  onClick={() => setSelectedCount(c)}
                >
                  {c === 0 ? "전체" : c}
                </div>
              ))}
            </div>

            <div className="checklist">
              <p>⚠ 시작 전 꼭 확인하세요</p>
              <ul>
                <li>카카오톡·인스타그램 인앱 브라우저 금지 (Chrome / Safari)</li>
                <li>아이패드·아이폰은 반드시 Safari 사용</li>
                <li>새 창(팝업)이 열리면 마이크 권한을 [허용]하세요</li>
              </ul>
            </div>

            <button className="btn btn-primary" disabled={starting} onClick={handleStart}>
              {starting ? "문항 준비 중..." : "이 정보로 평가 준비하기"}
            </button>
          </div>
        </div>
      ) : null}

      {view === "waiting" ? (
        <div className="view active">
          <div className="spacer" />
          <div className="mic-orbit">
            <div className="ring" />
            <div className="ring" />
            <div className="ring" />
            <div className="mic-core">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
                <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" />
                <path d="M19 11a7 7 0 0 1-14 0" />
                <line x1="12" y1="18" x2="12" y2="22" />
              </svg>
            </div>
          </div>
          <p className="status-line">{waitingText}</p>
          {showOpenPopupBtn ? (
            <button className="btn btn-primary" onClick={openMicPopup}>
              🎙️ 마이크 권한 허용하고 평가 시작
            </button>
          ) : null}
          {showReopenBtn ? (
            <button className="btn btn-ghost" onClick={openMicPopup}>
              평가 창이 안 보이면 다시 열기
            </button>
          ) : null}
          {showRetrySubmitBtn ? (
            <button
              className="btn btn-primary"
              onClick={() => {
                clearError();
                submitFinalResult();
              }}
            >
              📤 결과 다시 제출하기
            </button>
          ) : null}
          {showCancelBackBtn ? (
            <button className="btn btn-ghost" onClick={resetApp}>
              처음으로 돌아가기
            </button>
          ) : null}
          <div className="spacer" />
        </div>
      ) : null}

      {view === "result" && resultView ? (
        <div className="view active">
          <div className="card">
            {!resultView.isTime ? (
              <div className="score-hero">
                <div className="num">{resultView.score}</div>
                <div className="unit">점 / 100점 환산</div>
              </div>
            ) : (
              <div className="score-hero">
                <div className="num">
                  {Math.floor(resultView.elapsedSeconds / 60)}:
                  {String(resultView.elapsedSeconds % 60).padStart(2, "0")}
                </div>
                <div className="unit">전체 문항 완료까지 걸린 시간</div>
              </div>
            )}

            {resultView.isTime && resultView.leaderboard.length > 0 ? (
              <div className="leaderboard-box">
                <p className="lb-title">{leaderboardTitle}</p>
                <div>
                  {resultView.leaderboard.map((row, i) => {
                    const medals = ["🥇", "🥈", "🥉"];
                    const m = Math.floor(row.elapsedSeconds / 60);
                    const s = row.elapsedSeconds % 60;
                    const isMe = row.elapsedSeconds === resultView.elapsedSeconds;
                    return (
                      <div key={i} className={`lb-row${isMe ? " me" : ""}`}>
                        <span className="lb-rank">{medals[i] || `${i + 1}위`}</span>
                        <span className="lb-time">
                          {m}:{String(s).padStart(2, "0")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {!resultView.isTime ? (
              <div className="stat-row">
                <div className="stat-box correct">
                  <div className="n">{resultView.correct}</div>
                  <div className="l">맞은 문항</div>
                </div>
                <div className="stat-box wrong">
                  <div className="n">{resultView.total - resultView.correct}</div>
                  <div className="l">틀린 문항</div>
                </div>
                <div className="stat-box">
                  <div className="n">{resultView.total}</div>
                  <div className="l">전체 문항</div>
                </div>
              </div>
            ) : null}

            {!resultView.isTime && resultView.wrongQuestions.length > 0 ? (
              <div className="wrong-box">
                <p>❌ 틀린 문제</p>
                <div className="tags">
                  {resultView.wrongQuestions.map((q, i) => (
                    <span key={i} className="tag">
                      {q}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <button className="btn btn-primary" onClick={resetApp}>
              처음으로 돌아가기
            </button>
          </div>
        </div>
      ) : null}

      <FooterCredit />
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={null}>
      <PlayPageInner />
    </Suspense>
  );
}
