import { decryptJson } from "./crypto";

/** 학생용 링크 쿼리파라미터(token=)에 암호화되어 담기는 내용 */
export interface StudentLinkPayload {
  spreadsheetId: string;
  refreshToken: string;
}

export function decodeStudentToken(token: string): StudentLinkPayload {
  return decryptJson<StudentLinkPayload>(token);
}
