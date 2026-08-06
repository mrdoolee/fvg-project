import crypto from "node:crypto";

/**
 * 서버가 아무것도 저장하지 않는 대신, 교사 세션 쿠키와 학생용 링크 토큰 안에
 * 필요한 정보(access_token/refresh_token 등)를 이 함수로 암호화해서 담는다.
 * AES-256-GCM이라 위조/변조 시 복호화 단계에서 그대로 예외가 난다.
 */
function getKey(): Buffer {
  const b64 = process.env.LINK_SECRET_KEY;
  if (!b64) throw new Error("LINK_SECRET_KEY 환경변수가 없습니다.");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error("LINK_SECRET_KEY는 base64로 인코딩된 32바이트 키여야 합니다.");
  }
  return key;
}

export function encryptJson(payload: unknown): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

export function decryptJson<T>(token: string): T {
  const key = getKey();
  const combined = Buffer.from(token, "base64url");
  const iv = combined.subarray(0, 12);
  const authTag = combined.subarray(12, 28);
  const encrypted = combined.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as T;
}
