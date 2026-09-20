# EngageTrack — Legacy Prototype (v1)

This is the **inherited prototype** described in the EngageTrack 2.0 brownfield
case study: a rushed first attempt at connecting student project teams and
supervisors to activity from tools like GitHub and Trello. It is deliberately
left in a rough, "just about works" state — treat it as a legacy prototype to
investigate, not a reference solution.

## Running it

Requires Node.js (no other dependencies — it's built entirely on Node's
built-in `http`/`fs` modules, itself part of the problem, see below).

```bash
node server.js
```

Then open **http://localhost:3000**.

Data is stored in plain pipe-delimited `.txt` files under `data/` (no
database). You can open them in any text editor to see or reset state.

## Seeded accounts

| Username | Password       | Role       | Team          |
|----------|----------------|------------|---------------|
| admin    | admin123       | admin      | —             |
| jsmith   | password1      | student    | Team Falcon   |
| agupta   | qwerty         | student    | Team Falcon   |
| kobrien  | iloveunis99    | student    | Team Falcon   |
| lchen    | letmein123     | student    | Team Phoenix  |
| rpatel   | football1      | student    | Team Phoenix  |
| mgreen   | password1      | student    | Team Phoenix  |
| dwilson  | Sup3rvisor!    | supervisor | both teams    |


## Known issues

This list is a starting point for your own investigation, not a complete
audit. Structure and severity are for your team to assess.

**Architecture**
- Everything — routing, HTML generation, and data access — lives in a single
  `server.js`. There's no framework, no MVC-style separation, and
  no reusable auth/authorisation middleware.
- Persistence is flat text files read and rewritten synchronously on every
  request: no indexing, no transactions, and no locking around concurrent
  writes.
- The `sessions.txt` file grows by one row on every login, forever, and is
  scanned in full on every request.
- No automated tests anywhere in the repo.

**Security**
- Passwords are stored and compared in plain text, and a hardcoded
  override password bypasses authentication entirely for any account.
- Session tokens are small sequential integers (predictable), sessions never
  expire, and logging out only clears the browser cookie — the session
  itself is never invalidated server-side.
- Session cookies are set without `HttpOnly`, `Secure`, or `SameSite`.


**Product / assumptions worth questioning**
- Everyone — students and supervisors alike — sees the same undifferentiated
  view; there's no thought given to who should see what, or why.
- GitHub/Trello are wired in directly; there's no abstraction that would let
  another tool be added without touching core logic.

