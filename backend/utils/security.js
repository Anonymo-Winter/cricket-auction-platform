// "1d", "12h", "90m", "30s", "2w" -> milliseconds. A bare number is taken as seconds (as jsonwebtoken does).
export const parseDuration = (value, fallbackMs = 24 * 60 * 60 * 1000) => {
    const m = /^\s*(\d+)\s*(s|m|h|d|w)?\s*$/i.exec(String(value ?? ""));
    if (!m) return fallbackMs;
    const unit = { s: 1000, m: 60 * 1000, h: 3600 * 1000, d: 86400 * 1000, w: 7 * 86400 * 1000 }[(m[2] || "s").toLowerCase()];
    return Number(m[1]) * unit;
};

// Anyone who can guess JWT_KEY can sign a login for any account, admins included
export const jwtKeyProblem = (key) => {
    if (!key) return "JWT_KEY is not set.";
    if (key.length < 32) return `JWT_KEY is only ${key.length} characters; use at least 32 random ones.`;
    if (/^(change[-_ ]?me|my-?secret|secret|password|jwt|test)/i.test(key)) return "JWT_KEY looks like a placeholder; use a long random value.";
    return null;
};
