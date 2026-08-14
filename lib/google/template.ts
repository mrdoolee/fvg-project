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
        // 빈 값으로 두면 뭘 채워야 할지 알기 어려워서, 지우고 써도 되는 예시 문구를 넣어둔다.
        ["BRAND_TEXT", "두리쌤중학교 과학수업"],
        ["APP_TITLE", "단어 발음 평가"],
        ["APP_SUBTITLE", "화면에 나온 단어를 정확히 발음해보세요!"],
      ],
    },
    {
      // 빈 시트만 던져주면 스키마를 처음부터 이해해야 해서, 바로 지우고 써도 되는
      // 예시 행을 몇 개 채워둔다 — /guide 문서의 열 설명과 그대로 대응된다.
      range: "학생명부!A1",
      values: [
        ["학년", "반", "id", "name"],
        ["1", "1", "10101", "홍길동"],
        ["1", "1", "10102", "김철수"],
        ["1", "2", "10201", "이영희"],
      ],
    },
    {
      range: "데이터!A1",
      values: [
        ["question", "answers", "timeLimit", "unit", "lang"],
        ["사과", "사과", "5", "과일", "ko-KR"],
        ["바나나", "바나나", "5", "과일", "ko-KR"],
        ["apple", "apple", "5", "영단어", "en-US"],
        ["대한민국의 수도는?", "서울", "7", "", "ko-KR"],
      ],
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
