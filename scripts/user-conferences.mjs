#!/usr/bin/env node
// Prints the conference names that MemoPear users have entered in the app,
// most-used first. Used by the monthly blog automation to prioritize writing
// about conferences our users actually attend.
//
// Reads the public, names-only `conferenceSuggestions` Firestore collection via
// the REST API (no SDK, no auth — the collection is world-readable by rule).
// Needs the Firebase project id from the environment; if it is missing or the
// request fails, prints nothing so the automation falls back to its backlog and
// web research. This script is read-only and never writes.
//
// Usage: node scripts/user-conferences.mjs

const projectId =
  process.env.VITE_FIREBASE_PROJECT_ID ||
  process.env.FIREBASE_PROJECT_ID ||
  '';

if (!projectId) {
  // No project configured in this environment — nothing to print.
  process.exit(0);
}

const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/conferenceSuggestions?pageSize=300`;

try {
  const res = await fetch(url);
  if (!res.ok) process.exit(0);
  const data = await res.json();
  const docs = data.documents || [];
  const rows = docs
    .map((d) => ({
      name: d.fields?.name?.stringValue || '',
      count: Number(d.fields?.count?.integerValue || d.fields?.count?.doubleValue || 0),
    }))
    .filter((r) => r.name)
    .sort((a, b) => b.count - a.count);

  for (const r of rows) {
    console.log(`${r.name}\t(${r.count})`);
  }
} catch {
  // Network/parse error — stay silent so the automation falls back gracefully.
  process.exit(0);
}
