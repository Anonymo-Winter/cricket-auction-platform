import crypto from "crypto";
import Token from "../models/token.models.js";

const hashToken = (raw) => crypto.createHash("sha256").update(raw).digest("hex");

export const INVITE_TTL_HOURS = 7 * 24;
export const RESET_TTL_HOURS = 24;

// Creates a token and returns the raw value, which is shown once and never stored.
export const issueToken = async ({ type, email, name, user, createdBy, ttlHours }) => {
    const raw = crypto.randomBytes(32).toString("base64url");
    const doc = await Token.create({
        tokenHash: hashToken(raw),
        type,
        email,
        name,
        user,
        createdBy,
        expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
    });
    return { raw, doc };
};

// Read-only lookup (used to show the invite page); does not consume the token.
export const findValidToken = (raw, types) =>
    Token.findOne({
        tokenHash: hashToken(String(raw || "")),
        type: { $in: types },
        usedAt: null,
        expiresAt: { $gt: new Date() },
    });

// Atomically marks the token used, so two requests cannot redeem the same link.
// Pass the transaction session so a failure later rolls the token back to unused.
export const consumeToken = (raw, types, session) =>
    Token.findOneAndUpdate(
        {
            tokenHash: hashToken(String(raw || "")),
            type: { $in: types },
            usedAt: null,
            expiresAt: { $gt: new Date() },
        },
        { usedAt: new Date() },
        { new: true, session }
    );

export const clientUrl = () => process.env.CLIENT_URL || "http://localhost:5173";
