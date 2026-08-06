const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export class SheetTabNotFoundError extends Error {}

async function sheetsFetch(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(`${SHEETS_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 400 && body.includes("Unable to parse range")) {
      throw new SheetTabNotFoundError(body);
    }
    throw new Error(`Sheets API 오류 (${res.status}): ${body}`);
  }
  return res;
}

/**
 * GAS의 sheet.getDataRange().getValues()에 해당 — 탭 전체 값을 2차원 배열로 읽는다.
 * 탭 이름이 존재하지 않으면(GAS의 getSheetByName()===null과 동일 상황) null을 반환한다.
 */
export async function getValues(
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<unknown[][] | null> {
  try {
    const res = await sheetsFetch(
      accessToken,
      `/${spreadsheetId}/values/${encodeURIComponent(range)}`
    );
    const data = (await res.json()) as { values?: unknown[][] };
    return data.values ?? [];
  } catch (err) {
    if (err instanceof SheetTabNotFoundError) return null;
    throw err;
  }
}

/** GAS의 sheet.appendRow()에 해당 — 다음 빈 행에 안전하게 한 줄 추가 (자체 동시성 제어 포함) */
export async function appendRow(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  row: unknown[]
): Promise<void> {
  await sheetsFetch(
    accessToken,
    `/${spreadsheetId}/values/${encodeURIComponent(
      range
    )}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      body: JSON.stringify({ values: [row] }),
    }
  );
}

/** 여러 범위를 한 번에 씀 (템플릿 시트 초기화용) */
export async function batchUpdateValues(
  accessToken: string,
  spreadsheetId: string,
  data: { range: string; values: unknown[][] }[]
): Promise<void> {
  await sheetsFetch(accessToken, `/${spreadsheetId}/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ valueInputOption: "RAW", data }),
  });
}

/** 새 스프레드시트를 탭 구조까지 갖춰서 생성. 반환값은 생성된 spreadsheetId. */
export async function createSpreadsheet(
  accessToken: string,
  title: string,
  sheetTitles: string[]
): Promise<string> {
  const res = await sheetsFetch(accessToken, "", {
    method: "POST",
    body: JSON.stringify({
      properties: { title },
      sheets: sheetTitles.map((sheetTitle) => ({
        properties: { title: sheetTitle },
      })),
    }),
  });
  const data = (await res.json()) as { spreadsheetId: string };
  return data.spreadsheetId;
}
