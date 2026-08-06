import { NextRequest, NextResponse } from "next/server";
import { submitResult, type SubmitPayload } from "@/lib/appData";
import { resolveStudentToken } from "@/lib/studentAuth";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | (SubmitPayload & { token?: string })
    | null;

  if (!body?.token) {
    return NextResponse.json(
      { success: false, message: "token이 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const { accessToken, spreadsheetId } = await resolveStudentToken(
      body.token
    );
    // body에 섞인 token 필드는 submitResult가 쓰는 필드(mode/studentId/...)와
    // 겹치지 않으니 그대로 넘겨도 무해하다.
    const result = await submitResult(accessToken, spreadsheetId, body);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { success: false, message: "링크가 유효하지 않습니다." },
      { status: 400 }
    );
  }
}
