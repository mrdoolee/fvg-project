import { appendRow, getValues, SheetTabNotFoundError } from "./google/sheets";

/**
 * docs/handoff/current-code/gas-app/Code.gs 를 그대로 옮긴 것 — 시트 스키마(탭 이름,
 * 열 순서, 헤더)는 동결이므로 여기서 열 위치 인덱스를 바꾸면 안 된다.
 */

export interface Student {
  grade: string;
  classNo: string;
  id: string;
  name: string;
}

export interface QuizItem {
  qid: number;
  question: string;
  answers: string[];
  timeLimit: number;
  unit: string;
  lang: string;
}

export interface LeaderboardRow {
  elapsedSeconds: number;
}

export type SubmitPayload =
  | {
      mode: "TIME";
      studentId: string;
      studentName: string;
      unit: string;
      totalCount: number;
      elapsedSeconds: number;
    }
  | {
      mode: "SCORE";
      studentId: string;
      studentName: string;
      unit: string;
      totalCount: number;
      correctCount: number;
      wrongQuestions: string[];
    };

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatSeoulTimestamp(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day} ${hour}:${parts.minute}:${parts.second}`;
}

export async function getConfig(
  accessToken: string,
  spreadsheetId: string
): Promise<Record<string, string>> {
  const data = await getValues(accessToken, spreadsheetId, "환경설정");
  const config: Record<string, string> = {};
  if (!data) return config;
  for (let i = 1; i < data.length; i++) {
    const key = data[i]?.[0];
    if (!key) continue;
    config[String(key).trim()] = data[i]?.[1] != null ? String(data[i][1]) : "";
  }
  return config;
}

export async function getStudentList(
  accessToken: string,
  spreadsheetId: string
): Promise<
  { success: true; students: Student[] } | { success: false; message: string }
> {
  const data = await getValues(accessToken, spreadsheetId, "학생명부");
  if (!data) {
    return {
      success: false,
      message: '"학생명부" 탭을 찾을 수 없습니다. 탭 이름을 확인해주세요.',
    };
  }
  const students: Student[] = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i]?.[2]) continue;
    students.push({
      grade: String(data[i][0] ?? "").trim(),
      classNo: String(data[i][1] ?? "").trim(),
      id: String(data[i][2]).trim(),
      name: String(data[i][3] ?? "").trim(),
    });
  }
  return { success: true, students };
}

export async function getUnits(
  accessToken: string,
  spreadsheetId: string
): Promise<string[]> {
  const data = await getValues(accessToken, spreadsheetId, "데이터");
  if (!data) return [];
  const units: string[] = [];
  for (let i = 1; i < data.length; i++) {
    const u = data[i]?.[3] ? String(data[i][3]).trim() : "";
    if (u && !units.includes(u)) units.push(u);
  }
  units.sort();
  return units;
}

export async function getQuiz(
  accessToken: string,
  spreadsheetId: string,
  count: number,
  unit: string
): Promise<
  { success: true; quiz: QuizItem[] } | { success: false; message: string }
> {
  const data = await getValues(accessToken, spreadsheetId, "데이터");
  if (!data) {
    return {
      success: false,
      message: '"데이터" 탭을 찾을 수 없습니다. 탭 이름을 확인해주세요.',
    };
  }
  const pool: QuizItem[] = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i]?.[0]) continue;
    const rowUnit = data[i][3] ? String(data[i][3]).trim() : "";
    if (unit && rowUnit !== unit) continue;
    pool.push({
      qid: i,
      question: String(data[i][0]),
      answers: String(data[i][1] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      timeLimit: data[i][2] ? Number(data[i][2]) : 5,
      unit: rowUnit,
      lang: data[i][4] ? String(data[i][4]).trim() : "ko-KR",
    });
  }
  if (pool.length === 0) {
    return {
      success: false,
      message: unit
        ? `"${unit}" 단원에 해당하는 문항이 없습니다.`
        : '"데이터" 탭에 출제할 문항이 없습니다. 문항을 먼저 입력해주세요.',
    };
  }
  shuffle(pool);
  const n = Math.max(1, Math.min(Number(count) || pool.length, pool.length));
  return { success: true, quiz: pool.slice(0, n) };
}

async function getLeaderboard(
  accessToken: string,
  spreadsheetId: string,
  unit: string,
  totalCount: number
): Promise<LeaderboardRow[]> {
  const data = await getValues(accessToken, spreadsheetId, "기록");
  if (!data) return [];
  const rows: LeaderboardRow[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    const rowMode = row[3];
    const rowUnit = row[10] ? String(row[10]).trim() : "";
    const rowTotal = Number(row[7]);
    const elapsed = Number(row[9]);
    if (rowMode !== "시간측정") continue;
    if (rowUnit !== unit) continue;
    if (rowTotal !== Number(totalCount)) continue;
    if (!elapsed || elapsed <= 0) continue;
    rows.push({ elapsedSeconds: elapsed });
  }
  rows.sort((a, b) => a.elapsedSeconds - b.elapsedSeconds);
  return rows.slice(0, 3);
}

export type SubmitResult =
  | {
      success: true;
      mode: "TIME";
      elapsedSeconds: number;
      total: number;
      leaderboard: LeaderboardRow[];
    }
  | { success: true; mode: "SCORE"; score: number; correct: number; total: number }
  | { success: false; message: string };

export async function submitResult(
  accessToken: string,
  spreadsheetId: string,
  payload: SubmitPayload
): Promise<SubmitResult> {
  const ts = formatSeoulTimestamp();
  const mode = payload.mode === "TIME" ? "시간측정" : "채점";
  const studentId = payload.studentId || "";
  const studentName = payload.studentName || "";
  const unit = payload.unit || "";

  try {
    if (payload.mode === "TIME") {
      const elapsed = Number(payload.elapsedSeconds) || 0;
      await appendRow(accessToken, spreadsheetId, "기록", [
        ts,
        studentId,
        studentName,
        mode,
        "",
        "",
        "",
        payload.totalCount || 0,
        "",
        elapsed,
        unit,
      ]);
      return {
        success: true,
        mode: "TIME",
        elapsedSeconds: elapsed,
        total: payload.totalCount,
        leaderboard: await getLeaderboard(
          accessToken,
          spreadsheetId,
          unit,
          payload.totalCount
        ),
      };
    }

    const total = Number(payload.totalCount) || 0;
    const correct = Number(payload.correctCount) || 0;
    const score = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;
    const wrongList =
      payload.wrongQuestions && payload.wrongQuestions.length
        ? payload.wrongQuestions.join(", ")
        : "없음 (만점)";

    await appendRow(accessToken, spreadsheetId, "기록", [
      ts,
      studentId,
      studentName,
      mode,
      score,
      correct,
      total - correct,
      total,
      wrongList,
      "",
      unit,
    ]);
    return { success: true, mode: "SCORE", score, correct, total };
  } catch (err) {
    if (err instanceof SheetTabNotFoundError) {
      return {
        success: false,
        message: '"기록" 탭을 찾을 수 없습니다. 탭 이름을 확인해주세요.',
      };
    }
    return {
      success: false,
      message: "기록 저장 중 오류가 발생했습니다. 다시 시도해주세요.",
    };
  }
}
