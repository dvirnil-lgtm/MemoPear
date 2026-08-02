#!/usr/bin/env bash
#
# security-scan.sh — scans the MemoPear repository for accidentally exposed
# secrets, API keys, and client/customer data that should never be committed.
#
# Designed to run unattended (e.g. from the every-12-hours security routine)
# and locally before a push. It scans only files tracked by git, so build
# output and node_modules are ignored automatically.
#
# Exit codes:
#   0  clean — nothing suspicious found
#   1  findings — potential secret/data exposure detected (details on stdout)
#
# What is intentionally NOT flagged (public by design, documented in the repo):
#   - Firebase web config (apiKey/authDomain/appId): restricted by Firebase
#     security rules + API key referrer restrictions, meant to ship to clients.
#   - OAuth 2.0 client IDs (Google, HubSpot, LinkedIn partner id): public by
#     design; the matching client *secrets* live only in Cloud Functions secrets.
#
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

FINDINGS=0
report() {
  # $1 = heading, $2... = matching lines
  shift_heading="$1"; shift
  if [ -n "$1" ]; then
    FINDINGS=1
    echo "▲ POTENTIAL EXPOSURE — $shift_heading"
    printf '%s\n' "$@" | sed 's/^/    /'
    echo
  fi
}

# Collect git-tracked files, excluding this scanner and binary/lock/example files
# that are expected to contain placeholder-shaped strings.
# Exclude lock files and this scanner + its own doc (they intentionally contain
# the placeholder/example patterns being searched for), plus binary assets.
mapfile -t FILES < <(git ls-files \
  | grep -vE '(^|/)(package-lock\.json|scripts/security-scan\.sh|docs/security-monitoring\.md|\.env\.example)$' \
  | grep -vE '\.(png|jpg|jpeg|gif|ico|webp|woff2?|ttf|otf|pdf)$')

grep_tracked() { # $1 = extended regex; prints "file:line: match"
  git grep -nIE "$1" -- "${FILES[@]}" 2>/dev/null
}

# 1. Live secret token formats (provider-issued, never public).
report "Live secret tokens (AWS / Google API key / Stripe / Slack / GitHub / OpenAI / Gemini)" \
  "$(grep_tracked 'AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_\-]{35}|sk_live_[0-9A-Za-z]{24,}|rk_live_[0-9A-Za-z]{24,}|xox[baprs]-[0-9A-Za-z-]{10,}|gh[pousr]_[0-9A-Za-z]{36,}|sk-[A-Za-z0-9]{20,}|AIzaSy[0-9A-Za-z_\-]{33}')"

# 2. Private keys / PEM blocks.
report "Private key material (PEM / SSH)" \
  "$(grep_tracked 'BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY|PRIVATE KEY-----')"

# 3. Service-account / credential JSON fields with real-looking values.
report "Service-account or credential JSON with an embedded private key" \
  "$(grep_tracked '"private_key"[[:space:]]*:[[:space:]]*"-----BEGIN|"type"[[:space:]]*:[[:space:]]*"service_account"')"

# 4. Hardcoded credential literals (assignment to a long literal, excluding the
#    env-var / placeholder patterns this repo legitimately uses).
report "Hardcoded credential literal (not sourced from env)" \
  "$(grep_tracked "(client_secret|api[_-]?secret|(^|[^A-Za-z])(secret|password|passwd|pwd|access[_-]?token|refresh[_-]?token|private[_-]?key))[\"']?[[:space:]]*[:=][[:space:]]*[\"'][A-Za-z0-9/_+\-]{16,}[\"']" \
    | grep -viE 'your_|example|placeholder|_here|dummy|test|xxxx|<|\$\{|import\.meta\.env|process\.env|defineSecret|\.value\(\)|VITE_')"

# 5. Client / customer data files committed to the repo (exports, dumps, PII).
DATA_HITS="$(git ls-files \
  | grep -iE '(customer|client|lead|contact|subscriber|user|email)s?[-_.].*\.(csv|json|xlsx|sql)$|(export|dump|backup)[-_.].*\.(csv|json|sql)$' \
  | grep -vE '(package(-lock)?|tsconfig|firebase|firestore|metadata|components|manifest)\.json$')"
report "Committed file that may contain client/customer data (CSV/SQL/export dump)" "$DATA_HITS"

# 6. Firestore / Storage security rules. Rules are the runtime gate on client
#    data — a wide-open rule exposes every user's data even when no secret is in
#    the repo. Flag dangerous rules as a finding; treat missing rules as an
#    informational warning (it recurs, so it must not spam notifications).
mapfile -t RULES_FILES < <(git ls-files | grep -iE '(^|/)(firestore|storage)\.rules$|\.rules$')
if [ "${#RULES_FILES[@]}" -eq 0 ]; then
  echo "ℹ security-scan: no Firestore/Storage .rules file is version-controlled in this repo."
  echo "    Rules are the runtime gate on client data; keeping them in git lets this scan"
  echo "    verify them. Confirm the DEPLOYED rules are locked down:"
  echo "        firebase firestore:rules get      # or Firebase Console → Firestore → Rules"
  echo
else
  # Flag rules that grant access unconditionally (`if true`) or with no
  # condition at all. A line carrying a `scan-ok:` comment is treated as
  # reviewed-and-accepted (e.g. an intentional public read of non-personal data)
  # and skipped — use it sparingly and only with a written justification.
  DANGER_RULES="$(git grep -nIE 'allow[[:space:]]+(read|write|create|update|delete|list|get)([[:space:]]*,[[:space:]]*(read|write|create|update|delete|list|get))*[[:space:]]*:[[:space:]]*if[[:space:]]+true' -- "${RULES_FILES[@]}" 2>/dev/null | grep -v 'scan-ok')"
  DANGER_RULES="$DANGER_RULES$(git grep -nIE 'allow[[:space:]]+(read|write)([[:space:]]*,[[:space:]]*(read|write))*[[:space:]]*;' -- "${RULES_FILES[@]}" 2>/dev/null | grep -v 'scan-ok')"
  report "Firestore/Storage rule grants access with no real condition (allow … if true / unconditional)" "$DANGER_RULES"
fi

if [ "$FINDINGS" -eq 0 ]; then
  echo "✓ security-scan: clean — no exposed secrets or client data detected in tracked files."
  exit 0
fi
echo "security-scan: $FINDINGS category(ies) flagged above. Review before pushing."
exit 1
