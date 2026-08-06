import { NextRequest, NextResponse } from "next/server";
import { getQuiz } from "@/lib/appData";
import { resolveStudentToken } from "@/lib/studentAuth";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const token = params.get("token");
  if (!token) {
    return NextResponse.json(
      { success: false, message: "token이 필요합니다." },
      { status: 400 }
    );
  }
  const count = Number(params.get("count")) || 999;
  const unit = params.get("unit") || "";

  try {
    const { accessToken, spreadsheetId } = await resolveStudentToken(token);
    const result = await getQuiz(accessToken, spreadsheetId, count, unit);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { success: false, message: "링크가 유효하지 않습니다." },
      { status: 400 }
    );
  }
}
