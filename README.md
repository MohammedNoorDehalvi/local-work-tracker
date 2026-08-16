# Local Work Activity Tracker

A privacy-first, production-quality personal productivity tracker engineered to run entirely on `127.0.0.1:3000`. It collects authentic local activity data, stores it in a single local JSON database (`data/db.json`), and provides factual analytics visualizations through a Next.js App Router and Tailwind CSS v4 dashboard.

This is a personal productivity tool, **not employee surveillance software**. It collects data exclusively on the local machine where you deliberately install and run it.

---

## 1. Project Overview

- **Localhost Bound**: The web application and local APIs strictly bind to `127.0.0.1:3000`.
- **Single-Writer Database**: Only the Next.js process writes to `data/db.json` using atomic file replacements and OS-level file locking.
- **Authenticated Background Daemon**: A Node.js collector queries active foreground windows, detects idle duration via Win32 `GetLastInputInfo`, monitors user-selected folders, and aggregates 1-minute keystroke/click counters.
- **Offline Spooling & Replay**: Batches are spooled locally in `data/pending-events.ndjson` if the web process is offline and replayed with exponential backoff upon reconnection.
- **Zero Mock Data**: No fake, seeded, or placeholder data is ever loaded. In the absence of activity, clean empty states guide you to start your first session.

---

## 2. Privacy Philosophy & Guarantees

- **No External Network Calls**: The tracker never contacts external servers, cloud databases, or telemetry APIs.
- **Source-Level Privacy**: When window title collection is disabled, window titles are masked directly at the OS query source (emitting `null`), preventing titles from ever entering memory or IPC.
- **No Character Logging**: Key identities and character values are immediately discarded upon receipt. Only aggregate integer counters are recorded into 1-minute buckets.
- **Path Anonymization**: When full file paths are disabled, monitored directory names are hashed with a local random salt (`.path-salt`).
- **User Control**: You can immediately pause or resume tracking at any time with a single click.

---

## 3. Exact Data Collected

When tracking is enabled and a work session is active, the following data points are collected locally:

1. **Active Applications**: Process name, executable name, window title (if enabled), start timestamp, end timestamp, duration in seconds, and idle status.
2. **Idle Periods**: Idle start timestamp, end timestamp, and duration (triggered after 5 minutes of inactivity by default).
3. **Input Activity**: 1-minute bucket timestamps, total keypress count, and total mouse click count.
4. **File Activity**: File name, extension, parent directory (or hash), event type (`create`, `modify`, `rename`, `delete`), and timestamp (only inside folders you explicitly choose).
5. **Work Sessions**: Start, pause, resume, and completion timestamps, total active duration, and total idle duration.

---

## 4. Exact Data NOT Collected

The application **never** collects, records, or transmits:

- Raw keystrokes, typed characters, or key sequences
- Passwords or form inputs
- Clipboard or pasteboard contents
- Screenshots, screen recordings, or window contents
- Microphone or camera inputs
- Browser URL history or page DOM contents
- File contents or code inside monitored files
- Network packets or external telemetry
- Data from any other device on the network

---

## 5. System Requirements

- **Primary Platform**: Windows 11 (64-bit).
- **Secondary Platform**: Windows 10 22H2 on a best-effort compatibility basis (preferably systems enrolled in Extended Security Updates).
- **RAM**: 2 GB minimum (4 GB recommended).
- **Disk Space**: 150 MB for installation.

---

## 6. Node.js Version Requirement

- **Node.js**: `v20.9.0` or newer (Tested on Node `v24.x`).
- **npm**: `v10.x` or newer.

---

## 7. Installation Instructions

```bash
# Clone or navigate to the repository
cd local-work-tracker

# Install dependencies
npm install

# Initialize local environment & database
npm run bootstrap
```

---

## 8. Development Instructions

To start both the Next.js web application and the background collector simultaneously:

```bash
npm run dev
```

The web dashboard is available at:
```text
http://127.0.0.1:3000
```

---

## 9. Production Build Instructions

```bash
# Type check and build Next.js production bundle
npm run build
```

---

## 10. How to Start the Application in Production Mode

```bash
npm run start
```

---

## 11. How to Stop the Application

Press `Ctrl + C` in your terminal. `concurrently -k` ensures both the web server and collector process terminate cleanly, flushing all pending buffers and releasing lock files.

---

## 12. How to Initialize the Database

The database initializes automatically on first startup via `npm run bootstrap`. To manually initialize or verify the database:

```bash
npm run init-db
```

---

## 13. How to Reset the Database

To clear all recorded activity data while preserving user configuration:

```bash
npm run reset-data
```

This creates an automatic timestamped backup in `data/backups/` before resetting. To force reset even if a lock exists:

```bash
npm run reset-data -- --force
```

---

## 14. How to Select Monitored Folders

1. Open the dashboard at `http://127.0.0.1:3000`.
2. Navigate to **Settings** in the top navigation.
3. In the **Monitored Folders** card:
   - Click **Browse Folder Dialog...** to launch the native Windows folder picker dialog.
   - Or manually enter an absolute path (e.g. `C:\Projects\MyRepo`) and click **Add**.
4. The collector will automatically reconfigure its file watcher and begin logging file creation/modification events without reading file contents.

---

## 15. Troubleshooting Native Dependencies

- `active-win` and `uiohook-napi` are listed in `optionalDependencies`.
- If native C++ compilation tools are not available on your system, the application **will not crash**.
- The collector includes an integrated Win32 PowerShell helper supervisor that provides foreground window queries and `GetLastInputInfo` idle tracking natively.
- Capabilities that cannot load will display a "Degraded" capability badge in the status modal rather than breaking the application.

---

## 16. Troubleshooting Windows Permissions

- **PowerShell Execution Policy**: The collector spawns helper scripts with `-ExecutionPolicy Bypass -NoProfile`. No global administrative changes are required.
- **File Access (ACLs)**: On Windows, `scripts/bootstrap.ts` applies `icacls` permissions to `.collector-token` and `.path-salt`, restricting read/write access exclusively to the current user account.

---

## 17. Troubleshooting Occupied Ports

If port `3000` is already in use by another application:

```bash
# Kill existing Node process or start Next.js on another port:
npx next dev -H 127.0.0.1 -p 3001
```

---

## 18. Project Structure

```text
local-work-tracker/
├── app/
│   ├── api/
│   │   ├── activity/route.ts        # Activity query API
│   │   ├── analytics/route.ts       # Analytics calculations API
│   │   ├── collector/
│   │   │   ├── config/route.ts      # Collector config synchronization
│   │   │   └── ingest/route.ts      # Single-writer batch ingestion gateway
│   │   ├── data/route.ts            # Data purge API
│   │   ├── export/route.ts          # JSON / CSV export API
│   │   ├── folders/pick/route.ts    # Native Windows folder picker
│   │   ├── security/csrf/route.ts   # Double-submit CSRF token generator
│   │   ├── sessions/route.ts        # Work session lifecycle API
│   │   ├── settings/route.ts        # Settings retrieval and mutation
│   │   └── status/route.ts          # Collector & server health status
│   ├── dashboard/page.tsx           # Dashboard view with charts & KPI cards
│   ├── settings/page.tsx            # Settings & privacy configuration view
│   ├── globals.css                  # Tailwind CSS v4 & theme variables
│   ├── layout.tsx                   # Root layout with ToastProvider
│   └── page.tsx                     # Entry redirect to /dashboard
├── collector/
│   ├── active-window.ts             # Active window sample merger
│   ├── capabilities.ts              # Capability status registry
│   ├── file-monitor.ts              # Chokidar folder watcher
│   ├── idle-detector.ts             # Decoupled Win32 idle tracker
│   ├── index.ts                     # Main collector daemon orchestrator
│   ├── input-counter.ts             # Privacy-safe 1-min input bucket counter
│   ├── local-spool.ts               # Offline pending & rejected spool manager
│   ├── powershell-helper.ts         # Long-lived Win32 helper supervisor
│   └── types.ts                     # Collector internal types
├── components/
│   ├── activity/ActivityTable.tsx   # Filterable activity log table
│   ├── charts/                      # Recharts visualization components
│   ├── dashboard/                   # Summary cards, date picker, session bar
│   ├── settings/SettingsView.tsx    # Settings form & data purge dialog
│   ├── ui/                          # Button, Card, Badge, Modal, Toast, Input, Switch, etc.
│   └── Navbar.tsx                   # Header navigation and status indicator
├── lib/
│   ├── analytics.ts                 # Pure analytics calculation algorithms
│   ├── collector-auth.ts            # Bearer token verification
│   ├── csrf.ts                      # HMAC double-submit CSRF protection
│   ├── date-utils.ts                # Date range intervals and duration formatters
│   ├── db.ts                        # Single-writer atomic database manager
│   ├── event-ingestion.ts           # Batch ingestion & record merging
│   ├── export-utils.ts              # RFC 4180 CSV & JSON exporters
│   ├── read-limited-body.ts         # Pre-parse 1MB streaming body limiter
│   ├── request-security.ts          # Origin, host, and header validation
│   ├── server-env.ts                # Server constants and limits
│   ├── types.ts                     # Full TypeScript interfaces & contracts
│   └── validation.ts                # Zod runtime schemas
├── scripts/
│   ├── windows/
│   │   ├── get-active-window.ps1    # UTF-8 Win32 active window & idle stream
│   │   └── pick-folder.ps1          # Windows Forms folder picker dialog
│   ├── bootstrap.ts                 # Environment & ACL bootstrap script
│   ├── initialize-db.ts             # Manual database initializer
│   └── reset-data.ts                # Data reset with pre-reset backup
├── tests/                           # Vitest and Playwright test suites
├── package.json                     # Scripts, dependencies, engines
├── postcss.config.mjs               # Tailwind CSS v4 PostCSS plugin
├── next.config.ts                   # Next.js configuration and security headers
├── tsconfig.json                    # Strict TypeScript configuration
└── vitest.config.ts                 # Test runner configuration
```

---

## 19. Explanation of `data/db.json`

The database file `data/db.json` contains:
- `metadata`: Schema version, creation timestamp, last update timestamp, and last retention cleanup timestamp.
- `settings`: Tracking toggles, polling intervals, privacy flags, and monitored folder list.
- `collectorStatus`: Last heartbeat, collector PID, instance ID, and capability states.
- `sessions`: List of recorded work sessions (`activeDurationSeconds`, `idleDurationSeconds`, `status`).
- `applicationActivity`: Continuous merged application focus blocks (`appName`, `windowTitle`, `durationSeconds`).
- `inputActivity`: 1-minute aggregated keystroke and click count buckets.
- `fileActivity`: Monitored folder file creation, modification, and deletion events.
- `idlePeriods`: Inactivity periods exceeding the idle threshold.
- `processedBatches`: Bounded ledger of processed batch IDs for idempotency.

---

## 20. Export and Deletion Instructions

- **Export JSON**: Navigate to Settings -> Export Local Data -> Click **Export JSON** to download `work-tracker-export-YYYY-MM-DD.json`.
- **Export CSV**: Navigate to Settings -> Export Local Data -> Click **Export CSV** to download `work-tracker-export-YYYY-MM-DD.csv`.
- **Delete All Data**: Navigate to Settings -> Purge All Activity Data -> Type `DELETE_ALL_DATA` in the confirmation dialog. A backup is automatically saved to `data/backups/` before records are wiped.

---

## 21. Known Platform Limitations

- **Windows**: Full feature set supported. Windows 11 is the primary target; Windows 10 22H2 is supported on best-effort compatibility.
- **macOS / Linux**: Architecture is abstracted with platform adapters; native active window and folder picker dialogs will fall back to manual path entry and degraded capability status on non-Windows platforms.

---

## 22. Security Limitations

- The application is engineered strictly for **single-user local machine use**.
- Do not expose port 3000 to public networks or port forwarding tools.
- Origin validation and CSRF protections reject requests originating from external browser tabs.

---

## 23. Verification Commands

```bash
# 1. Run ESLint flat config
npm run lint

# 2. Run TypeScript type checking
npm run typecheck

# 3. Run Vitest unit & integration test suite
npm run test

# 4. Run Playwright E2E browser tests
npm run test:e2e

# 5. Run full verification suite (lint, typecheck, test, build)
npm run verify
```
