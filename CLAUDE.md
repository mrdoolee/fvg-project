# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

A Next.js (App Router, TypeScript) port of a Google Apps Script app ("Flashcard Voice Game"): students speak a flashcard word/phrase aloud, the browser's Web Speech API grades it, results are written to a teacher-owned Google Sheet. Teachers authenticate with Google; students never log in (they just pick their name from a dropdown).

The full migration context — architecture rationale, frozen sheet schema, and load-bearing bug fixes that must not be reintroduced — lives in `docs/handoff/MIGRATION_BRIEF.md`. The original GAS source it was ported from is preserved verbatim under `docs/handoff/current-code/` for reference. Read the brief before making any change that touches sheet schema, `public/mic/index.html`, or auth flow.

## Commands

```bash
npm run dev      # start dev server (Turbopack)
npm run build    # production build (also runs the TypeScript check)
npm run start    # run a production build
npm run lint     # eslint
npx tsc --noEmit # type-check only, faster than a full build
```

There is no test suite in this repo yet.

## Environment

Copy `.env.example` to `.env.local` and fill in real values (Google Cloud OAuth client + API key, a generated `LINK_SECRET_KEY`, and the mic-page URL/origin — see the comments in that file for exactly where each value comes from and why). Nothing in `.env.local` should ever be committed.

## Architecture

**No database, ever.** Google Sheets is the only datastore, by design — see brief section 2 for why (avoids the app owner becoming a data controller for student data across many schools). Do not introduce Firebase/Supabase/Postgres/Redis/KV storage of any kind to "simplify" auth or data access; that has been proposed and reverted once already because it centralizes every teacher's credentials behind one server-held key, which defeats the whole point.

**Auth is `drive.file`-scope-only OAuth, and it's stateless end to end:**
- Teacher flow: `/api/auth/google` → Google consent → `/api/auth/google/callback` exchanges the code for a `refresh_token`, which is AES-256-GCM-encrypted (`lib/crypto.ts`, key = `LINK_SECRET_KEY`) into an httpOnly cookie (`lib/teacherSession.ts`). That cookie only powers the setup flow (Picker, template creation) — there is no persistent teacher account/session beyond it.
- Handoff to students: once a teacher has a `spreadsheetId`, the server encrypts `{spreadsheetId, refreshToken}` directly into the student link's `token` query param (`lib/studentToken.ts`) — this is the entire "student database," a link is the credential. `/api/teacher/sheet/link` mints it, and also caches the plain link string in that sheet's own `환경설정` tab under a `STUDENT_LINK` key (via `lib/google/envConfig.ts`'s `upsertEnvConfig`) so a returning teacher gets the same link back instead of a fresh one (pass `regenerate: true` to force a new one — this does not invalidate the old link, since there's nothing server-side to revoke). Writing/reading that key happens through the teacher's own live session, so it isn't the same circular-bootstrap problem the anonymous student flow has.
  - A KV/DB-backed variant of this handoff (short opaque link + server-side token store) was tried once and reverted — it centralizes every teacher's refresh_token behind one server-held key, which reintroduces exactly the liability the no-database design is meant to avoid. Don't reintroduce it without re-reading why.
- Every student-facing API route (`/api/config`, `/api/students`, `/api/units`, `/api/quiz`, `/api/submit`) decrypts that token per-request via `lib/studentAuth.ts` and exchanges the embedded refresh_token for a fresh access_token on the spot (`lib/google/oauth.ts`). Nothing is cached or stored server-side between requests.
- Student identity (roster dropdown vs. anonymous) is controlled by the `STUDENT_MODE` 환경설정 key (`ROSTER` default / `ROSTER_AND_ANONYMOUS` / `ANONYMOUS_ONLY`, read in `app/play/page.tsx`) — this was a deliberately easy add because `/api/submit` and `/api/quiz` never validated `studentId` against `학생명부` in the first place, so "anonymous" is just the frontend sending `{id: "", name: "익명"}` instead of a roster pick. No backend/schema change was needed.
- Never use the `spreadsheets` OAuth scope — only `drive.file` (see `lib/google/config.ts`). The broader scope triggers Google's app-verification review and a 100-tester cap; `drive.file` doesn't.

**Sheets access is hand-rolled REST, not the `googleapis` SDK** — `lib/google/sheets.ts` wraps `fetch` calls to the Sheets API v4 directly (`getValues`, `appendRow`, `batchUpdateValues`, `createSpreadsheet`). `lib/appData.ts` is the port of the original `Code.gs`: it contains all the row-shape/column-index logic (`getConfig`, `getStudentList`, `getUnits`, `getQuiz`, `submitResult` + the private leaderboard calc) and must keep those column positions in lock-step with the frozen schema in the brief — the tab names (`환경설정`/`학생명부`/`데이터`/`기록`) and column order are not free to change without asking the user.

**No LockService equivalent for concurrent writes** — `values.append` is used bare. This was deliberately load-tested (28 concurrent submits, 0 loss) rather than assumed safe; don't add a lock/queue "just in case" without re-reading why it was skipped.

**`public/mic/index.html` is a byte-for-byte copy of `docs/handoff/current-code/mic-page/index.html` and must stay that way.** It's a self-contained static page (no framework, no build step) handling all the microphone/`SpeechRecognition` logic, opened via `window.open()` as a popup from `/app/play/page.tsx` and talking back to the opener over `postMessage`. It encodes about a dozen hard-won bug fixes (engine-reuse, watchdog timers, `resultIndex`-based result handling, etc. — brief section 6 lists them). Don't refactor or "clean up" this file; if a change is genuinely needed, read section 6 first and preserve every behavior listed there.

**Route map:**
- `/` — the teacher dashboard (`app/page.tsx`), a single view-state component (`checking → login → setup → working → done/error`) covering OAuth login, Google Picker or template auto-creation, and displaying the student link. `/teacher` and `/teacher/setup` are legacy paths that now just redirect here (bookmark compatibility only — don't add real UI back to them). `app/AboutButton.tsx` is the shared version/about-info modal, used here and on `/guide`.
- `/guide` — static teacher-facing manual (sheet tab formats, mode differences, student browser requirements, link-reuse behavior). Keep it in sync when the sheet schema, template sample data, or link-reuse behavior changes.
- `/play?token=...` — the student-facing single-page flow (`app/play/page.tsx`); ported from the original `Index.html` + `JavaScript.html`. State that needs to stay fresh inside long-lived closures (the `postMessage` listener, the popup-watchdog interval) is kept in `useRef`s rather than `useState`, mirroring the mutable globals the original vanilla-JS version relied on — don't "fix" these into state without checking why.
- `/mic/index.html` — the static mic-page described above.

**Template auto-creation ships with sample rows, not just headers** (`lib/google/template.ts`) — a few example students, a few example quiz items (mixed units, one no-unit item, one non-Korean-lang item), and placeholder `BRAND_TEXT`/`APP_TITLE`/`APP_SUBTITLE` values. This is intentional so a new teacher's link is immediately clickable/testable; keep it in mind if the schema or `/guide` wording changes, since they should stay consistent with each other.
