// Runs the integration tests against a throwaway database and a server started just for them.
//
//   npm run test:integration                 all suites
//   npm run test:integration -- bidding      only suites whose file name contains "bidding"
//
// Your real database is never touched: the tests use "<name>_test" (and "<name>_test_invite", "<name>_test_limits" for
// the servers that need a different setup), all derived from MONGO_URL, and drop them at the end.
import { spawn } from "child_process";
import { readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const suitesDir = path.join(root, "tests", "integration");

if (!process.env.MONGO_URL) {
    console.error("MONGO_URL is not set (see backend/.env.example).");
    process.exit(1);
}

// .../ipl_auction?x=y -> .../ipl_auction_test?x=y
const testUrl = process.env.MONGO_URL.replace(/\/([^/?]+)(\?|$)/, (_, name, tail) => `/${name.replace(/_test$/, "")}_test${tail}`);
if (testUrl === process.env.MONGO_URL) {
    console.error("Could not derive a separate test database name from MONGO_URL.");
    process.exit(1);
}

const BASE_PORT = Number(process.env.TEST_PORT || 18080);

// Every server gets its OWN database. The server runs a scheduler against its database, and two servers sharing one
// would both advance the same auctions from their own memory, which is exactly what must never happen in production.
const dbUrlFor = (serverName) =>
    serverName === "default"
        ? testUrl
        : testUrl.replace(/\/([^/?]+)(\?|$)/, (_, name, tail) => `/${name}_${serverName}${tail}`);

// Each suite can ask for a server set up a particular way. "default" is what most suites use.
const SERVERS = {
    default: { port: BASE_PORT, env: { SIGNUP_MODE: "open", RATE_LIMIT_DISABLED: "true", RESULT_BREAK_SECONDS: "0" } },
    invite: { port: BASE_PORT + 1, env: { SIGNUP_MODE: "invite", RATE_LIMIT_DISABLED: "true", RESULT_BREAK_SECONDS: "0" } },
    pause: { port: BASE_PORT + 3, env: { SIGNUP_MODE: "open", RATE_LIMIT_DISABLED: "true", RESULT_BREAK_SECONDS: "3" } },
    limits: { port: BASE_PORT + 2, env: { SIGNUP_MODE: "open", RATE_LIMIT_DISABLED: "false" } },
};
const serverFor = (file) => (file.includes(".invite.") ? "invite" : file.includes(".limits.") ? "limits" : file.includes(".pause.") ? "pause" : "default");

const filter = process.argv[2] || "";
const files = readdirSync(suitesDir)
    .filter((f) => f.endsWith(".test.mjs") && f.includes(filter))
    .sort();
if (files.length === 0) {
    console.error(`No integration suites match "${filter}".`);
    process.exit(1);
}

const started = [];
const serverLogs = new Map();
const KEEP_LOGS = !!process.env.TEST_SERVER_LOGS; // TEST_SERVER_LOGS=1 prints each server's output at the end
const startServer = (name) =>
    new Promise((resolve, reject) => {
        const { port, env } = SERVERS[name];
        const child = spawn("node", ["index.js"], {
            cwd: root,
            env: { ...process.env, ...env, MONGO_URL: dbUrlFor(name), PORT: String(port), NODE_ENV: "test" },
            stdio: ["ignore", "pipe", "pipe"],
        });
        started.push(child);
        let ready = false;
        let log = "";
        serverLogs.set(name, () => log);
        const onData = (chunk) => {
            log += chunk;
            if (!ready && /Database connected/.test(log)) {
                ready = true;
                resolve(child);
            }
        };
        child.stdout.on("data", onData);
        child.stderr.on("data", (c) => (log += c));
        child.on("exit", (code) => !ready && reject(new Error(`Server "${name}" exited with ${code}\n${log}`)));
        setTimeout(() => !ready && reject(new Error(`Server "${name}" did not start in time\n${log}`)), 20000);
    });

const runSuite = (file) =>
    new Promise((resolve) => {
        const serverName = serverFor(file);
        const { port } = SERVERS[serverName];
        const child = spawn("node", [path.join(suitesDir, file)], {
            cwd: root,
            env: {
                ...process.env,
                MONGO_URL: dbUrlFor(serverName),
                API_URL: `http://localhost:${port}/api`,
                SOCKET_URL: `http://localhost:${port}`,
                NODE_NO_WARNINGS: "1",
            },
            stdio: ["ignore", "pipe", "pipe"],
        });
        let out = "";
        child.stdout.on("data", (c) => (out += c));
        child.stderr.on("data", (c) => (out += c));
        child.on("close", (code) => resolve({ file, code, out }));
    });

const cleanup = async () => {
    for (const child of started) child.kill();
    for (const name of Object.keys(SERVERS)) {
        try {
            const conn = await mongoose.createConnection(dbUrlFor(name)).asPromise();
            await conn.dropDatabase();
            await conn.close();
        } catch (error) {
            console.error(`Could not drop the "${name}" test database:`, error.message);
        }
    }
};
process.on("SIGINT", async () => {
    await cleanup();
    process.exit(130);
});

let failed = 0;
try {
    const needed = [...new Set(files.map(serverFor))];
    for (const name of needed) await startServer(name);

    for (const file of files) {
        process.stdout.write(`\n=== ${file}\n`);
        const { code, out } = await runSuite(file);
        const lines = out.split("\n").filter((l) => l.trim() && !/Warning|trace-warnings/i.test(l));
        // Passing suites print just the summary; a failing one prints everything
        console.log((code === 0 ? lines.filter((l) => /passed/.test(l)) : lines).join("\n"));
        if (code !== 0) failed++;
    }
} catch (error) {
    console.error(error.message);
    failed++;
} finally {
    await cleanup();
}

if (KEEP_LOGS) {
    for (const [name, get] of serverLogs) console.log(`\n--- server log (${name}) ---\n${get()}`);
}

console.log(failed === 0 ? `\nAll ${files.length} integration suites passed.` : `\n${failed} of ${files.length} integration suites FAILED.`);
process.exit(failed ? 1 : 0);
