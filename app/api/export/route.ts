import { NextResponse } from "next/server";
import { getDatabaseReadOnly } from "@/lib/db";
import { validateLocalOrigin, STANDARD_API_HEADERS } from "@/lib/request-security";
import { exportCompleteDatabaseToJson, exportAllDataToCombinedCsv } from "@/lib/export-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!validateLocalOrigin(request)) {
    return NextResponse.json(
      { error: "Forbidden: Origin unauthorized" },
      { status: 403, headers: STANDARD_API_HEADERS }
    );
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "json";
  const db = getDatabaseReadOnly();

  const timestamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const csvContent = exportAllDataToCombinedCsv(db);
    const fileName = `work-tracker-export-${timestamp}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        ...STANDARD_API_HEADERS,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  }

  const jsonContent = exportCompleteDatabaseToJson(db);
  const fileName = `work-tracker-export-${timestamp}.json`;

  return new NextResponse(jsonContent, {
    status: 200,
    headers: {
      ...STANDARD_API_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
