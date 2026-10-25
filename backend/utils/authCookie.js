import jwt from "jsonwebtoken";
import { parseDuration } from "./security.js";

// The login cookie lives exactly as long as the token inside it (JWT_EXPIRES_IN, default 1 day), so it is never
// sent after the token has expired
const lifetimeMs = () => parseDuration(process.env.JWT_EXPIRES_IN);

export const signAuthToken = (email, id) =>
    jwt.sign({ email, id }, process.env.JWT_KEY, { expiresIn: Math.round(lifetimeMs() / 1000) });

export const setAuthCookie = (res, email, id) => {
    res.cookie("jwt", signAuthToken(email, id), {
        maxAge: lifetimeMs(),
        httpOnly: true,
        secure: true,
        sameSite: "strict",
    });
};
