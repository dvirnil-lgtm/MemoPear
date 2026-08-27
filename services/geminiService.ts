import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase";
import { Lead, ScannedLeadData } from "../types";

/**
 * MemoPear is a client-rendered app, so the Gemini API key must never ship in
 * the browser bundle — a key embedded there is world-readable and can be lifted
 * from the deployed JavaScript to run up the project's AI Studio bill. Every
 * Gemini call therefore runs in a Firebase Cloud Function (see functions/index.js:
 * aiParseScan / aiParseBusinessCard / aiFollowUpEmail), which holds the key as a
 * server-only secret. This module just invokes those callables; no key, and no
 * @google/genai SDK, is loaded on the client.
 */
const functions = getFunctions(app);

/**
 * User-facing message shown when the Gemini API rejects a request because the
 * project's billing/quota is exhausted (HTTP 429 RESOURCE_EXHAUSTED).
 */
export const QUOTA_ERROR_MESSAGE = "AI quota exhausted — check Gemini API billing.";

/** Error thrown by the service helpers when the Gemini API returns a quota/billing failure. */
export class QuotaError extends Error {
  constructor(message: string = QUOTA_ERROR_MESSAGE) {
    super(message);
    this.name = "QuotaError";
  }
}

/**
 * Detects whether an error is a quota/billing failure. The server proxy raises a
 * `resource-exhausted` HttpsError for Gemini 429s, which reaches the client as a
 * FunctionsError with code `functions/resource-exhausted`; we also keep the
 * substring checks for defensive coverage.
 */
export const isQuotaError = (error: unknown): boolean => {
  if (!error) return false;
  const code = (error as any)?.code;
  if (code === "functions/resource-exhausted" || code === "resource-exhausted") return true;
  const status = (error as any)?.status;
  if (status === 429 || status === "RESOURCE_EXHAUSTED") return true;
  const text = (typeof error === "string" ? error : (error as any)?.message ?? "").toLowerCase();
  return (
    text.includes("resource_exhausted") ||
    text.includes("quota") ||
    text.includes("credits are depleted") ||
    text.includes("billing") ||
    text.includes("429")
  );
};

/**
 * Parses raw text (often vCard or unstructured) from a conference badge QR code,
 * server-side via the `aiParseScan` Cloud Function.
 */
export const parseScannedData = async (rawText: string): Promise<ScannedLeadData> => {
  try {
    const call = httpsCallable<{ rawText: string }, ScannedLeadData>(functions, "aiParseScan");
    const res = await call({ rawText });
    return (res.data as ScannedLeadData) || {};
  } catch (error) {
    console.error("Error parsing scanned data:", error);
    if (isQuotaError(error)) throw new QuotaError();
    return {};
  }
};

/**
 * Extracts contact details from a business-card image, server-side via the
 * `aiParseBusinessCard` Cloud Function. Accepts a data URL or bare base64 string.
 */
export const parseBusinessCard = async (base64Image: string): Promise<ScannedLeadData> => {
  try {
    const call = httpsCallable<{ imageBase64: string }, ScannedLeadData>(functions, "aiParseBusinessCard");
    const res = await call({ imageBase64: base64Image });
    return (res.data as ScannedLeadData) || {};
  } catch (error) {
    console.error("Error parsing business card:", error);
    if (isQuotaError(error)) throw new QuotaError();
    return {};
  }
};

/**
 * Generates a follow-up email draft for a lead, server-side via the
 * `aiFollowUpEmail` Cloud Function. Throws QuotaError on a billing/quota failure
 * so the caller can surface it distinctly.
 */
export const generateFollowUpEmail = async (lead: Lead): Promise<string> => {
  try {
    const call = httpsCallable<{ lead: Lead }, { text: string }>(functions, "aiFollowUpEmail");
    const res = await call({ lead });
    return res.data?.text || "";
  } catch (error) {
    console.error("Error generating follow-up email:", error);
    if (isQuotaError(error)) throw new QuotaError();
    throw error;
  }
};
