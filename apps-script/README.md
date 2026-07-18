# Taweed Lughoh — Apps Script Backend

Backend-only. Google Sheets is the database, Google Apps Script is the API,
deployed as a Web App. No frontend code lives here.

## Files

| File | Purpose |
|---|---|
| `appsscript.json` | Project manifest (timezone, runtime, web app access). |
| `Backend.gs` | Everything else, in one file: sheet helpers, auth, Students/Attendance/Scores/Classes handlers, the `doGet`/`doPost` router, and the one-time `seedInitialData()` seed. Sectioned with `/* === ... === */` comment headers for navigation. |

## Sheet schema

Spreadsheet: https://docs.google.com/spreadsheets/d/1au-CmLyZvBM_pI_q49DjY-YQcm6wmriea8v2-3v9g8M/edit

| Tab | Columns |
|---|---|
| **Users** | id, username, password (SHA-256 hash — used for login), salt, role (`admin`\|`tutor`), assignedClass, plainPassword (readable copy, see security note below) |
| **Students** | id, name, class, preTest, postTest |
| **Attendance** | studentId, meeting, status (`Present`\|`Permission`\|`Sick`\|`Absent`) |
| **Classes** | id, name |

Tabs/headers are created automatically on first use (`getOrCreateSheet`), but
run the seed once so there's actual data and at least one login account.

## Deploy

1. Open the spreadsheet above → **Extensions → Apps Script**.
2. In the Apps Script editor, replace the default `Code.gs` content with
   the contents of `Backend.gs` from this folder (rename the file to
   `Backend` if you'd like, or just paste into `Code.gs` — the filename
   doesn't matter to Apps Script).
3. Run `seedInitialData` once: pick it from the function dropdown → **Run**.
   Approve the permission prompts (this script only needs access to the
   spreadsheet it's bound to).
4. Open the **Users** sheet tab and read the `plainPassword` column for the
   `admin` and `tutor.kelas7` rows — that's the real login password for
   each account, kept readable in the sheet itself (not just a one-time
   log line) specifically so it isn't lost. See the security note below.
5. **Deploy → New deployment** → type **Web app** → Execute as **Me**,
   Who has access **Anyone** → **Deploy**. Copy the Web app URL — that's the
   API base URL.
6. After any code change, use **Deploy → Manage deployments → Edit → New
   version** to push the change live without changing the URL.

### Security note on `plainPassword`

The `password` column is still what login actually checks (a SHA-256 hash);
`plainPassword` is a convenience column added on top of that so a lost
password doesn't require re-running a reset. The tradeoff: **anyone with
view access to this spreadsheet can read every user's real password** in
that column. Fine for a small internal tool where you control who the
sheet is shared with — restrict sharing (or hide/protect that column) if
that's ever not true.

## Lost a password?

Check the `plainPassword` column in the Users sheet first. If that's
genuinely blank (e.g. an account created before this column existed), it
can't be recovered from the hash — reset it instead. In the Apps Script
editor, pick `resetAdminPassword` or `resetTutorPassword` from the function
dropdown → **Run**. This also backfills `plainPassword` for that account
going forward.

## Added tutor rows or classes by hand in the sheet?

Rows typed directly into Users/Classes bypass the app's id/password
generation, which usually leaves 2 things broken: no password hash (can't
log in) and/or an `id` that's just the username typed in by hand instead of
a random UUID (defeats this backend's "no session token, trust the id" auth
model — see the Auth model section below).

Run `fixTutorSetup` once from the function dropdown → **Run**, then check
the `plainPassword` column in the Users sheet for every newly-generated
password. It also adds any of the 16 standard classes (`cls-1`..`cls-16`,
"Kelas 7".."Kelas 22") missing from the Classes sheet. Safe to re-run — it
only touches rows that are actually missing something, and never resets an
account that already has a password (see `fixUserAccounts` in Backend.gs).

## A tutor gets "Forbidden: no access to this class"

Every class match (`Students.class` vs `Users.assignedClass` vs
`Classes.id`) is trimmed before comparing, so stray whitespace from manual
typing isn't the cause anymore. What's left is a genuine id mismatch —
most commonly a student's `class` cell (or a tutor's `assignedClass` cell)
was typed as the class **name** (e.g. `8A`) instead of its **id** (e.g.
`cls-16`) from the Classes sheet.

Run `debugClassAccess` from the function dropdown → **Run** → **View →
Logs**. It prints every tutor's `assignedClass`, every distinct
`Students.class` value, and the full Classes id→name list, each wrapped in
`[brackets]` — compare the tutor's assignedClass against the Classes list
to find its correct id, then check that the affected students' `class`
cells use that same id, not the class name.

## Calling the API (for whoever wires up the frontend later)

Single base URL for everything (Apps Script Web Apps don't support path
routing) — action name + method decide what happens:

- Apps Script `ContentService` has no API for setting response headers, so
  there's no explicit CORS header being set anywhere in this code. To avoid
  the browser sending a CORS preflight (`OPTIONS`) that Apps Script cannot
  answer, **all POST requests must use `Content-Type: text/plain;charset=utf-8`**
  (a CORS-safelisted header) even though the body is JSON text — the server
  parses `e.postData.contents` as JSON regardless of the declared type. GET
  requests are plain query strings and never trigger a preflight.

### GET (`?action=...` query params)

| action | params | requires |
|---|---|---|
| `students` | `userId` | any logged-in user |
| `attendance` | `userId`, optional `meeting`, `studentId` | any logged-in user |
| `scores` | `userId`, optional `class` | any logged-in user |
| `classes` | `userId` | any logged-in user |

### POST (JSON body: `{ action, userId, payload }`)

| action | payload | requires |
|---|---|---|
| `login` | `{ username, password }` (no `userId`) | — |
| `createStudent` | `{ name, class, preTest?, postTest? }` | admin |
| `updateStudent` | `{ id, name?, class?, preTest?, postTest? }` | admin |
| `deleteStudent` | `{ id }` | admin |
| `saveAttendance` | `[{ studentId, meeting, status }, ...]` | admin, or tutor for their own class |
| `saveScores` | `[{ studentId, preTest?, postTest? }, ...]` | admin, or tutor for their own class |

### Response shape

Always `{ "success": boolean, "data"?: ..., "error"?: string }`.

## Auth model

There is no session token. `login` returns `{ id, username, role,
assignedClass }`; the client stores `id` and resends it as `userId` on every
subsequent request. Each request re-resolves the user's role/assignedClass
fresh from the Users sheet server-side (`requireUser`) — the client cannot
claim a role. IDs are UUIDs (`Utilities.getUuid()`) specifically so they
aren't guessable, since the residual risk of this simpler model (vs. a
CacheService-backed session token) is that anyone who learns a valid user id
can act as that user without a password from the second request onward.

## Known trade-offs

- **Last write wins** — no optimistic concurrency/versioning. Fine for a
  small internal tool with one or two concurrent editors, not for high
  contention.
- **No cascade delete** — deleting a student leaves their attendance rows
  in place (orphaned, harmless, just unreferenced).
- **Fixed header-driven column order** — helpers read columns by header
  name from row 1, so reordering data rows is safe but renaming headers
  breaks reads/writes silently.
- **Every request is 2-3s minimum**, even ones doing almost no work — this
  is Apps Script Web App overhead (the redirect-to-`script.googleusercontent.com`
  dance plus per-invocation cold start), not something the code controls.
  `saveAttendance`/`saveScores` do read the whole target sheet once per
  save (not once per record — see the comment in `saveAttendance` for why
  that distinction mattered), but a single request still can't beat that
  baseline.
