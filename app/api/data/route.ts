import { NextResponse } from "next/server";
import { mutateDatabase, createDatabaseBackup } from "@/lib/db";
import { validateClientMutationRequest, STANDARD_API_HEADERS } from "@/lib/request-security";
import { deleteDataSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  const securityCheck = validateClientMutationRequest(request);
  if (!securityCheck.valid) {
    return securityCheck.errorResponse!;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: STANDARD_API_HEADERS }
    );
  }

  const parseResult = deleteDataSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Confirmation string 'DELETE_ALL_DATA' is required to delete data.",
      },
      { status: 400, headers: STANDARD_API_HEADERS }
    );
  }

  const { createBackup } = parseResult.data;
  let backupPath: string | null = null;

  if (createBackup) {
    backupPath = createDatabaseBackup("pre-delete");
  }

  await mutateDatabase((db) => {
    db.sessions = [];
    db.applicationActivity = [];
    db.inputActivity = [];
    db.fileActivity = [];
    db.idlePeriods = [];
    db.processedBatches = [];
  });

  return NextResponse.json(
    {
      success: true,
      message: "All tracking and activity records have been deleted.",
      backupCreated: backupPath !== null,
      backupPath,
    },
    { status: 200, headers: STANDARD_API_HEADERS }
  );
}
