import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/appData";
import { resolveStudentToken } from "@/lib/studentAuth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token이 필요합니다." }, { status: 400 });
  }
  try {
    const { accessToken, spreadsheetId } = await resolveStudentToken(token);
    const config = await getConfig(accessToken, spreadsheetId);
    return NextResponse.json(config);
  } catch {
    return NextResponse.json(
      { error: "링크가 유효하지 않습니다." },
      { status: 400 }
    );
  }
}
