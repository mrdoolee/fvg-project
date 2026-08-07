import { appendRow, getValues, updateValues } from "./sheets";

/**
 * "환경설정" 탭(key | value)에 값을 upsert한다 — 이미 그 key의 행이 있으면 값만 덮어쓰고,
 * 없으면 새 행을 추가한다. 새 key를 추가하는 건 스키마 동결 원칙에 어긋나지 않는다
 * (key-value 탭이라 원래부터 행 추가로 확장 가능하도록 설계됨).
 */
export async function upsertEnvConfig(
  accessToken: string,
  spreadsheetId: string,
  key: string,
  value: string
): Promise<void> {
  const data = await getValues(accessToken, spreadsheetId, "환경설정");
  if (data) {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i]?.[0] ?? "").trim() === key) {
        const row = i + 1; // 1-indexed 시트 행 번호
        await updateValues(accessToken, spreadsheetId, `환경설정!B${row}`, [[value]]);
        return;
      }
    }
  }
  await appendRow(accessToken, spreadsheetId, "환경설정", [key, value]);
}
