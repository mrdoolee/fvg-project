import { batchUpdateValues, createSpreadsheet } from "./sheets";

// 시트 스키마는 동결 — docs/handoff/MIGRATION_BRIEF.md "4. 현재 시트 스키마" 참고.
// 탭 이름/열 순서/헤더를 바꾸려면 먼저 사용자에게 이유를 설명하고 승인을 받아야 한다.
export const SHEET_TABS = ["환경설정", "학생명부", "데이터", "기록"] as const;

/**
 * mic-page는 "공용 정적 페이지 하나"로 배포하기로 결정됐으므로(브리핑 5번 항목),
 * 모든 교사의 템플릿에 같은 주소를 자동으로 채워 넣는다. 아직 mic-page를 배포하기 전이면
 * 빈 문자열로 남고, 교사가 "환경설정" 탭에서 나중에 직접 채워도 된다.
 */
function getSharedMicPageConfig() {
  return {
    url: process.env.NEXT_PUBLIC_MIC_PAGE_URL ?? "",
    origin: process.env.NEXT_PUBLIC_MIC_PAGE_ORIGIN ?? "",
  };
}

/** 빈 템플릿 스프레드시트를 스키마 그대로 생성한다 (교사 첫 로그인 시 "자동 생성" 경로) */
export async function createTemplateSpreadsheet(
  accessToken: string,
  title: string
): Promise<string> {
  const spreadsheetId = await createSpreadsheet(accessToken, title, [
    ...SHEET_TABS,
  ]);

  const micPage = getSharedMicPageConfig();

  await batchUpdateValues(accessToken, spreadsheetId, [
    {
      range: "환경설정!A1",
      values: [
        ["key", "value"],
        ["MIC_PAGE_URL", micPage.url],
        ["MIC_PAGE_ORIGIN", micPage.origin],
        ["BRAND_TEXT", ""],
        ["APP_TITLE", ""],
        ["APP_SUBTITLE", ""],
      ],
    },
    {
      range: "학생명부!A1",
      values: [["학년", "반", "id", "name"]],
    },
    {
      range: "데이터!A1",
      values: [["question", "answers", "timeLimit", "unit", "lang"]],
    },
    {
      range: "기록!A1",
      values: [
        [
          "일시",
          "학번",
          "이름",
          "모드",
          "점수",
          "맞은문항수",
          "틀린문항수",
          "출제문항수",
          "틀린문제들",
          "소요시간(초)",
          "단원",
        ],
      ],
    },
  ]);

  return spreadsheetId;
}
