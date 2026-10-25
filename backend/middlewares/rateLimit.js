import rateLimit from "express-rate-limit";

// Limits are per client IP (behind a proxy, set TRUST_PROXY so the real IP is used) unless a keyGenerator says
// otherwise. RATE_LIMIT_DISABLED=true switches them all off (used by the automated tests).
const make = ({ windowMs, limit, message, keyGenerator }) =>
    rateLimit({
        windowMs,
        limit,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: { success: false, message },
        skip: () => process.env.RATE_LIMIT_DISABLED === "true",
        ...(keyGenerator ? { keyGenerator } : {}),
    });

const MINUTE = 60 * 1000;

// Guessing passwords
export const loginLimiter = make({
    windowMs: 15 * MINUTE,
    limit: 10,
    message: "Too many sign-in attempts. Please wait a few minutes and try again.",
});

// Mass account creation
export const signupLimiter = make({
    windowMs: 60 * MINUTE,
    limit: 10,
    message: "Too many sign-up attempts from this address. Please try again later.",
});

// Guessing invite / reset links, and probing which emails have accounts
export const tokenLimiter = make({
    windowMs: 15 * MINUTE,
    limit: 30,
    message: "Too many attempts. Please wait a few minutes and try again.",
});
export const emailCheckLimiter = make({
    windowMs: 15 * MINUTE,
    limit: 30,
    message: "Too many email checks. Please wait a few minutes and try again.",
});

// A bidder can't usefully bid more than a few times a second; this stops scripts hammering the endpoint.
// Keyed by the signed-in user (use after verifyToken).
export const bidLimiter = make({
    windowMs: 10 * 1000,
    limit: 25,
    message: "You're bidding too fast. Slow down a little.",
    keyGenerator: (req) => `user:${req.user?.id || req.ip}`,
});

// A generous ceiling for everything else under /api
export const apiLimiter = make({
    windowMs: MINUTE,
    limit: 600,
    message: "Too many requests. Please slow down.",
});
