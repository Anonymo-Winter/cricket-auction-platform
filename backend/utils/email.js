import validator from "validator";

// Signup stores validator.normalizeEmail(email) (lower-cased, Gmail dots stripped), but older accounts and
// logins may use the raw spelling. Look up by every plausible spelling so both match.
export const emailLookupKeys = (email) => {
    const trimmed = String(email ?? "").trim();
    if (!trimmed) return [];
    const normalized = validator.normalizeEmail(trimmed) || trimmed.toLowerCase();
    return [...new Set([trimmed, trimmed.toLowerCase(), normalized])];
};

export const storableEmail = (email) => {
    const trimmed = String(email ?? "").trim();
    if (!trimmed) return "";
    return validator.normalizeEmail(trimmed) || trimmed.toLowerCase();
};
