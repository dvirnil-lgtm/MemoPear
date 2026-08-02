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
