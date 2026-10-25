// Rate limits, error handling and the health check. The runner starts this suite's server with rate limiting ON.
import { check, call, connectDb, clearDb, finish, API } from "./harness.mjs";
import User from "../../models/user.models.js";

await connectDb();
await clearDb();

try {
    const health = await call("GET", "/health");
    check("the health check reports the database is up", health.status === 200 && health.json.ok === true && health.json.database === "connected");

    const notFound = await call("GET", "/definitely-not-a-route");
    check("an unknown /api route is a JSON 404, not an HTML page", notFound.status === 404 && notFound.json.success === false);

    const res = await fetch(API + "/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: "{ this is not json" });
    const body = await res.json().catch(() => null);
    check("a malformed JSON body is a clear 400", res.status === 400 && /valid JSON/.test(body?.message || ""), body?.message);

    const helmetHeader = (await fetch(API + "/health")).headers.get("x-content-type-options");
    check("security headers are set", helmetHeader === "nosniff");

    await User.create({ name: "ZZ Owner", email: "zz-o@example.com", password: "ownerpass123", role: "user" });
    let ok = 0;
    let firstBlocked = null;
    for (let i = 1; i <= 12; i++) {
        const r = await call("POST", "/auth/login", null, { email: "zz-o@example.com", password: `wrong-${i}` });
        if (r.status === 401) ok++;
        if (r.status === 429 && !firstBlocked) firstBlocked = i;
    }
    check("repeated wrong passwords are throttled after 10 tries", ok === 10 && firstBlocked === 11, `${ok} answered normally, blocked from attempt ${firstBlocked}`);
    const blocked = await call("POST", "/auth/login", null, { email: "zz-o@example.com", password: "ownerpass123" });
    check("...even for the right password, until the window passes", blocked.status === 429 && blocked.json.success === false && /Too many/.test(blocked.json.message));
    check("the blocked response is JSON and says when to retry", blocked.headers.get("ratelimit") !== null || blocked.headers.get("retry-after") !== null);

    const probes = [];
    for (let i = 0; i < 32; i++) probes.push((await call("POST", "/auth/is-email-already-in-use", null, { email: `probe${i}@example.com` })).status);
    check("probing which emails have accounts is throttled", probes.slice(0, 30).every((s) => s === 200) && probes.slice(30).every((s) => s === 429), probes.slice(28).join(","));
} catch (error) {
    console.error("TEST ERROR:", error);
    check("suite ran without crashing", false);
}
await finish(clearDb);
