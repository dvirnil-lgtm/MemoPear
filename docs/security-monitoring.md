# Website security monitoring

Automated, recurring check that the MemoPear website repository never leaks
secrets, API keys, or client/customer data.

## What runs

`scripts/security-scan.sh` scans **git-tracked files only** for:

1. **Live secret tokens** — AWS access keys, Google API keys (`AIza…`), Stripe
   live keys (`sk_live_…`), Slack/GitHub/OpenAI/Gemini tokens.
2. **Private key material** — PEM / OpenSSH / PGP private key blocks.
3. **Service-account credential JSON** — files with an embedded `private_key`
   or `"type": "service_account"`.
4. **Hardcoded credential literals** — `secret`/`password`/`access_token`/etc.
   assigned to a long literal instead of being read from env or Firebase secrets.
5. **Committed client/customer data** — CSV/JSON/SQL exports, dumps, or backups
   whose names suggest leads, contacts, subscribers, or user data.
6. **Firestore / Storage security rules** — flags rules that grant access with
   no real condition (`allow read, write: if true;` or an unconditional
   `allow read, write;`). These are the runtime gate on client data: a wide-open
   rule exposes every user's records even when no secret is in the repo. If no
   `*.rules` file is version-controlled, the scan prints an informational note
   (it does not fail, so it won't repeatedly notify) reminding you to keep rules
   in git and to verify the deployed rules.

Run it locally any time:

```bash
./scripts/security-scan.sh    # exit 0 = clean, exit 1 = findings
```

## What is intentionally NOT flagged (public by design)

These appear in client-side code on purpose and are safe to ship:

- **Firebase web config** (`apiKey`, `authDomain`, `appId`, …) — protected by
  Firestore security rules and API-key referrer restrictions, not a secret.
- **OAuth 2.0 client IDs** (Google, HubSpot) and the **LinkedIn partner id** —
  public by design. Their matching *client secrets* live only in Cloud
  Functions secrets (`defineSecret`), never in the repo.

## The recurring routine

A scheduled routine runs **every 12 hours** and, in a fresh session:

1. Pulls the latest `claude/website-security-monitoring-p3pfoy` branch.
2. Runs `scripts/security-scan.sh` plus a broader review of new commits for any
   exposed keys, secrets, or client data.
3. **If clean:** re-arms silently, no notification.
4. **If something is exposed:** notifies the owner (push + email) with the exact
   file/line, then fixes it immediately — removes the secret from the code,
   moves it to env/Firebase secrets, commits, and pushes to the branch. Any
   already-committed live secret is called out as needing rotation, since git
   history preserves it.

To change the cadence or pause it, update or disable the routine (it is a
scheduled trigger owned by the account that created it).

## Verifying the DEPLOYED Firestore rules

The scanner can only see rules committed to this repo. Runtime rules live in
Firebase and should be checked directly (and, ideally, committed here so the
scan covers them):

```bash
firebase firestore:rules get          # prints the currently deployed ruleset
```

Or in the console: **Firebase Console → Firestore Database → Rules**. The
version-controlled rules live in `firestore.rules` (wired via `firebase.json`)
and are what `firebase deploy --only firestore:rules` ships. A safe baseline
scopes every document to its owner, e.g.:

```
match /users/{uid}/{doc=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

Never ship `allow read, write: if true;` to production.

### `scan-ok` suppressions

An intentional, reviewed exception (e.g. a genuinely public, non-personal read)
can be annotated with a trailing `// scan-ok: <reason>` comment on the same
line as the `allow`. The scanner skips lines carrying `scan-ok`. Use it rarely
and always with a written justification — it is an audit trail, not an off
switch.

## Team seats are managed server-side

Seat claiming and removal run in the `claimSeat` / `removeSeatMember` Cloud
Functions (admin SDK), never from the browser. This is deliberate:

- A `seatClaims/{uid}` document existing is what grants a teammate Pro access.
  If the client could write its own claim, any signed-in user could self-grant
  Pro for free, bypassing payment and the seat cap. Rules therefore set
  `seatClaims` to `read: own only`, `write: if false` — only the functions write it.
- Claiming a seat writes the *owner's* subscription doc from a non-owner
  account. Keeping that in a function lets `subscriptions` stay
  `write: owner-only`, so no one can tamper with another owner's seats, invite
  token, or member list.
