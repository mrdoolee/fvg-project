import { NextRequest, NextResponse } from "next/server";
import { getUnits } from "@/lib/appData";
import { resolveStudentToken } from "@/lib/studentAuth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json([], { status: 400 });
  }
  try {
    const { accessToken, spreadsheetId } = await resolveStudentToken(token);
    const units = await getUnits(accessToken, spreadsheetId);
    return NextResponse.json(units);
  } catch {
    return NextResponse.json([], { status: 400 });
  }
}
