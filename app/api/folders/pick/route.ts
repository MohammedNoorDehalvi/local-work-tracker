import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { NextResponse } from "next/server";
import { validateClientMutationRequest, STANDARD_API_HEADERS } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let isDialogActive = false;

export async function POST(request: Request) {
  const securityCheck = validateClientMutationRequest(request);
  if (!securityCheck.valid) {
    return securityCheck.errorResponse!;
  }

  if (process.platform !== "win32") {
    return NextResponse.json(
      { error: "Folder picker dialog is currently only supported on Windows. Please enter path manually." },
      { status: 400, headers: STANDARD_API_HEADERS }
    );
  }

  if (isDialogActive) {
    return NextResponse.json(
      { error: "A folder selection dialog is already open." },
      { status: 409, headers: STANDARD_API_HEADERS }
    );
  }

  isDialogActive = true;
  const scriptPath = path.resolve(process.cwd(), "scripts/windows/pick-folder.ps1");

  try {
    const selectedPath = await new Promise<string>((resolve, reject) => {
      const child = spawn(
        "powershell.exe",
        [
          "-NoLogo",
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-STA",
          "-File",
          scriptPath,
        ],
        {
          windowsHide: true,
          shell: false,
          stdio: ["ignore", "pipe", "pipe"],
        }
      );

      let stdout = "";
      let stderr = "";

      const timeout = setTimeout(() => {
        try {
          child.kill();
        } catch {
          // Ignore
        }
        reject(new Error("Folder picker timed out after 60 seconds."));
      }, 60000);

      // Handle request abort
      if (request.signal) {
        request.signal.addEventListener("abort", () => {
          clearTimeout(timeout);
          try {
            child.kill();
          } catch {
            // Ignore
          }
          reject(new Error("Request was aborted."));
        });
      }

      if (child.stdout) {
        child.stdout.on("data", (data) => {
          stdout += data.toString("utf-8");
          if (stdout.length > 8192) {
            child.kill();
            reject(new Error("Folder picker output exceeded maximum length."));
          }
        });
      }

      if (child.stderr) {
        child.stderr.on("data", (data) => {
          stderr += data.toString("utf-8");
        });
      }

      child.on("close", (code) => {
        clearTimeout(timeout);
        if (code !== 0 && stderr) {
          console.error("Folder picker stderr:", stderr);
        }
        resolve(stdout.trim());
      });

      child.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    if (!selectedPath) {
      return NextResponse.json(
        { canceled: true, path: null },
        { status: 200, headers: STANDARD_API_HEADERS }
      );
    }

    // Validate path
    const resolvedPath = path.resolve(selectedPath);

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { error: "Selected path does not exist." },
        { status: 400, headers: STANDARD_API_HEADERS }
      );
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isDirectory()) {
      return NextResponse.json(
        { error: "Selected path is not a directory." },
        { status: 400, headers: STANDARD_API_HEADERS }
      );
    }

    // Reject tracker's own internal directories
    const cwd = process.cwd().toLowerCase();
    const targetLower = resolvedPath.toLowerCase();
    if (
      targetLower === cwd ||
      targetLower.startsWith(path.join(cwd, "data").toLowerCase()) ||
      targetLower.startsWith(path.join(cwd, ".git").toLowerCase()) ||
      targetLower.startsWith(path.join(cwd, "node_modules").toLowerCase())
    ) {
      return NextResponse.json(
        { error: "Cannot monitor internal application folders (data, .git, node_modules)." },
        { status: 400, headers: STANDARD_API_HEADERS }
      );
    }

    return NextResponse.json(
      { canceled: false, path: resolvedPath },
      { status: 200, headers: STANDARD_API_HEADERS }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Folder picker error: ${msg}` },
      { status: 500, headers: STANDARD_API_HEADERS }
    );
  } finally {
    isDialogActive = false;
  }
}
