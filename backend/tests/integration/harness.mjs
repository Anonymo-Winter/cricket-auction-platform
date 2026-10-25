// Shared helpers for the integration tests. They talk to a real server (started by scripts/runIntegration.js)
// and a real database, so they refuse to run unless MONGO_URL points at a "_test" database.
import mongoose from "mongoose";
import { io } from "socket.io-client";

export const API = process.env.API_URL || "http://localhost:18080/api";
export const SOCKET_URL = process.env.SOCKET_URL || "http://localhost:18080";

if (!/_test(_[a-z]+)?(\?|$)/.test(process.env.MONGO_URL || "")) {
    console.error("Refusing to run: MONGO_URL must point at a database whose name ends in _test (or _test_<server>).\nUse `npm run test:integration`, which sets this up for you.");
    process.exit(2);
}

const results = [];
export const check = (name, ok, detail = "") => {
    results.push(!!ok);
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -> " + detail : ""}`);
};
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const future = (mins) => new Date(Date.now() + mins * 60000).toISOString();

export const call = async (method, path, cookie, body) => {
    const res = await fetch(API + path, {
        method,
        headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = {};
    try {
        json = JSON.parse(text);
    } catch {
        // not JSON (e.g. a CSV)
    }
    return { status: res.status, json, text, headers: res.headers, setCookie: res.headers.get("set-cookie") };
};
export const cookieOf = (r) => "jwt=" + /jwt=([^;]+)/.exec(r.setCookie)[1];

export const connectSocket = (cookie) =>
    new Promise((resolve) => {
        const socket = io(SOCKET_URL, { transports: ["websocket"], extraHeaders: cookie ? { cookie } : {} });
        const events = [];
        socket.onAny((name, payload) => events.push({ name, payload }));
        socket.on("connect", () => resolve({ socket, events }));
    });

export const waitEvent = async (conn, name, ms = 2500, from = 0) => {
    const start = Date.now();
    while (Date.now() - start < ms) {
        const hit = conn.events.slice(from).find((e) => e.name === name);
        if (hit) return hit;
        await sleep(50);
    }
    return null;
};

export const connectDb = () => mongoose.connect(process.env.MONGO_URL);

// Empties every collection (indexes stay, so unique constraints keep working). The _test database is only ever
// used by these tests, so each suite starts from, and leaves behind, a clean slate.
export const clearDb = async () => {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
};

export const finish = async (cleanup) => {
    try {
        await cleanup?.();
        await mongoose.disconnect();
    } catch (error) {
        console.error("Cleanup problem:", error);
    }
    const failed = results.filter((r) => !r).length;
    console.log(`\n${results.length - failed}/${results.length} passed`);
    process.exit(failed || results.length === 0 ? 1 : 0);
};

// Standard owners: sign up through the real endpoint so a team is created too
export const signupOwner = async (i) => {
    const r = await call("POST", "/auth/signup-team", null, {
        name: `ZZ Owner ${i}`,
        email: `zz-o${i}@example.com`,
        password: "ownerpass123",
        teamName: `ZZ Team ${i}`,
        shortName: `ZZ${i}`,
        logo: "x",
        color: "blue",
    });
    if (r.status !== 201) throw new Error("signup failed: " + JSON.stringify(r.json));
    return { cookie: cookieOf(r), teamId: String(r.json.team._id), userId: r.json.user._id };
};
