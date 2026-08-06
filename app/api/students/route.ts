import { NextRequest, NextResponse } from "next/server";
import { getStudentList } from "@/lib/appData";
import { resolveStudentToken } from "@/lib/studentAuth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json(
      { success: false, message: "token이 필요합니다." },
      { status: 400 }
    );
  }
  try {
    const { accessToken, spreadsheetId } = await resolveStudentToken(token);
    const result = await getStudentList(accessToken, spreadsheetId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { success: false, message: "링크가 유효하지 않습니다." },
      { status: 400 }
    );
  }
}
