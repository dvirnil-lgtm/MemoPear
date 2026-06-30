import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Conference lookup
//
// Powers the in-app "type to find a conference" autocomplete. The user never
// leaves MemoPear: as they type, we surface matching conference names and their
// locations inline.
//
// Data sources, in priority order:
//   1. Wikidata (live)  — a free, open, no-API-key knowledge base that lists
//      conferences/trade fairs/conventions worldwide with their locations. Its
//      query endpoint is CORS-enabled, so the browser can call it directly.
//   2. A small bundled list of well-known global events — shown instantly while
//      the live results load, and used as a fallback if Wikidata is unreachable
//      so the feature still works offline / behind restrictive networks.
//
// We only ever surface a conference NAME and a LOCATION — nothing else.
// ---------------------------------------------------------------------------

export interface ConferenceResult {
  name: string;
  location: string;
}

// Curated seed list of major global conferences (name + city, country). These
// are stable, well-known events; the live Wikidata query adds the long tail.
export const BUNDLED_CONFERENCES: ConferenceResult[] = [
  { name: 'CES', location: 'Las Vegas, USA' },
  { name: 'Mobile World Congress (MWC)', location: 'Barcelona, Spain' },
  { name: 'Web Summit', location: 'Lisbon, Portugal' },
  { name: 'AWS re:Invent', location: 'Las Vegas, USA' },
  { name: 'Google I/O', location: 'Mountain View, USA' },
  { name: 'Microsoft Build', location: 'Seattle, USA' },
  { name: 'Microsoft Ignite', location: 'Chicago, USA' },
  { name: 'Apple WWDC', location: 'Cupertino, USA' },
  { name: 'Dreamforce', location: 'San Francisco, USA' },
  { name: 'SaaStr Annual', location: 'San Mateo, USA' },
  { name: 'Computex', location: 'Taipei, Taiwan' },
  { name: 'IFA Berlin', location: 'Berlin, Germany' },
  { name: 'GITEX Global', location: 'Dubai, UAE' },
  { name: 'VivaTech', location: 'Paris, France' },
  { name: 'Slush', location: 'Helsinki, Finland' },
  { name: 'Collision', location: 'Toronto, Canada' },
  { name: 'TechCrunch Disrupt', location: 'San Francisco, USA' },
  { name: 'SXSW', location: 'Austin, USA' },
  { name: 'Hannover Messe', location: 'Hannover, Germany' },
  { name: 'RSA Conference', location: 'San Francisco, USA' },
  { name: 'Black Hat USA', location: 'Las Vegas, USA' },
  { name: 'DEF CON', location: 'Las Vegas, USA' },
  { name: 'KubeCon + CloudNativeCon', location: 'Rotating' },
  { name: 'Game Developers Conference (GDC)', location: 'San Francisco, USA' },
  { name: 'Gamescom', location: 'Cologne, Germany' },
  { name: 'NVIDIA GTC', location: 'San Jose, USA' },
  { name: 'Oracle CloudWorld', location: 'Las Vegas, USA' },
  { name: 'SAP Sapphire', location: 'Orlando, USA' },
  { name: 'Adobe Summit', location: 'Las Vegas, USA' },
  { name: 'HubSpot INBOUND', location: 'Boston, USA' },
  { name: 'Money20/20', location: 'Las Vegas, USA' },
  { name: 'Consensus', location: 'Austin, USA' },
  { name: 'TOKEN2049', location: 'Singapore' },
  { name: 'Cannes Lions', location: 'Cannes, France' },
  { name: 'DMEXCO', location: 'Cologne, Germany' },
  { name: 'World Economic Forum', location: 'Davos, Switzerland' },
  { name: 'IAA Mobility', location: 'Munich, Germany' },
  { name: 'Bauma', location: 'Munich, Germany' },
  { name: 'NAB Show', location: 'Las Vegas, USA' },
  { name: 'NRF Big Show', location: 'New York, USA' },
  { name: 'J.P. Morgan Healthcare Conference', location: 'San Francisco, USA' },
  { name: 'HIMSS Global Health Conference', location: 'Las Vegas, USA' },
  { name: 'ASCO Annual Meeting', location: 'Chicago, USA' },
  { name: 'Cisco Live', location: 'Las Vegas, USA' },
  { name: 'IBM Think', location: 'Boston, USA' },
  { name: 'Cloudflare Connect', location: 'New York, USA' },
  { name: 'Snowflake Summit', location: 'San Francisco, USA' },
  { name: 'GamesBeat Summit', location: 'Los Angeles, USA' },
  { name: 'Money 20/20 Europe', location: 'Amsterdam, Netherlands' },
  { name: 'Web3 Summit', location: 'Berlin, Germany' },
  { name: 'Affiliate World', location: 'Bangkok, Thailand' },
  { name: 'Sibos', location: 'Rotating' },
  { name: 'IMEX', location: 'Frankfurt, Germany' },
  { name: 'CeBIT Australia', location: 'Sydney, Australia' },
  { name: 'Smart City Expo World Congress', location: 'Barcelona, Spain' },
  { name: 'Singapore FinTech Festival', location: 'Singapore' },
  { name: 'RISE', location: 'Hong Kong' },
  { name: 'The Next Web (TNW) Conference', location: 'Amsterdam, Netherlands' },
  { name: 'Lisbon Web Summit', location: 'Lisbon, Portugal' },
  { name: 'DLD Conference', location: 'Munich, Germany' },
];

const norm = (s: string) => s.trim().toLowerCase();

/** Filter the bundled list by a query (case-insensitive substring match). */
export function searchBundled(query: string, limit = 8): ConferenceResult[] {
  const q = norm(query);
  if (!q) return [];
  const starts = BUNDLED_CONFERENCES.filter((c) => norm(c.name).startsWith(q));
  const contains = BUNDLED_CONFERENCES.filter(
    (c) => !norm(c.name).startsWith(q) && norm(c.name).includes(q),
  );
  return [...starts, ...contains].slice(0, limit);
}

// Builds a SPARQL query that searches Wikidata for entities matching the typed
// text that are some kind of event (subclass of "event", Q1656682), and returns
// each one's label plus a location/country. EntitySearch narrows the candidate
// set to a handful of matches first, so the subclass walk stays fast.
function buildSparql(query: string): string {
  const safe = query.replace(/["\\]/g, ' ').trim();
  return `SELECT ?itemLabel ?placeLabel ?countryLabel WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:api "EntitySearch" .
    bd:serviceParam wikibase:endpoint "www.wikidata.org" .
    bd:serviceParam mwapi:search "${safe}" .
    bd:serviceParam mwapi:language "en" .
    bd:serviceParam mwapi:limit "15" .
    ?item wikibase:apiOutputItem mwapi:item .
  }
  ?item wdt:P31/wdt:P279* wd:Q1656682 .
  OPTIONAL { ?item wdt:P276 ?place . }
  OPTIONAL { ?item wdt:P17 ?country . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
LIMIT 8`;
}

const WDQS_ENDPOINT = 'https://query.wikidata.org/sparql';

/** Query Wikidata live. Resolves to [] on any error (network, CORS, timeout). */
export async function searchWikidata(
  query: string,
  signal?: AbortSignal,
): Promise<ConferenceResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const url = `${WDQS_ENDPOINT}?format=json&query=${encodeURIComponent(buildSparql(q))}`;
    const res = await fetch(url, {
      signal,
      headers: { Accept: 'application/sparql-results+json' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const out: ConferenceResult[] = [];
    const seen = new Set<string>();
    for (const b of data?.results?.bindings || []) {
      const name: string = b.itemLabel?.value || '';
      // Skip raw Q-ids that come back when an item has no English label.
      if (!name || /^Q\d+$/.test(name)) continue;
      const key = norm(name);
      if (seen.has(key)) continue;
      seen.add(key);
      const location = b.placeLabel?.value || b.countryLabel?.value || '';
      out.push({ name, location });
    }
    return out;
  } catch {
    return [];
  }
}

/** Merge two result lists, de-duplicating by normalized name (first wins). */
function merge(a: ConferenceResult[], b: ConferenceResult[], limit = 8): ConferenceResult[] {
  const out: ConferenceResult[] = [];
  const seen = new Set<string>();
  for (const c of [...a, ...b]) {
    const key = norm(c.name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length >= limit) break;
  }
  return out;
}

export interface ConferenceSearchState {
  results: ConferenceResult[];
  loading: boolean;
}

// Debounced conference search hook. Shows bundled matches instantly, then merges
// in live Wikidata results when they arrive. Stale/aborted requests are dropped.
export function useConferenceSearch(query: string): ConferenceSearchState {
  const [results, setResults] = useState<ConferenceResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    const local = searchBundled(q);
    setResults(local);
    if (q.length < 2) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const live = await searchWikidata(q, controller.signal);
      if (controller.signal.aborted) return;
      setResults(live.length ? merge(local, live) : local);
      setLoading(false);
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { results, loading };
}
