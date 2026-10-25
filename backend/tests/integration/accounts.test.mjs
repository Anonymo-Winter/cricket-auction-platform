// Accounts: invites, password reset, deactivation, the activity log and the first-admin script.
import { execFile } from "child_process";
import { promisify } from "util";
import { check, call, cookieOf, connectDb, clearDb, finish, signupOwner } from "./harness.mjs";
import User from "../../models/user.models.js";
import { parseDuration } from "../../utils/security.js";

const run = promisify(execFile);
await connectDb();
await clearDb();

try {
    await User.create({ name: "ZZ Admin", email: "zz-admin@example.com", password: "adminpass123", role: "admin" });
    const admin = cookieOf(await call("POST", "/auth/login", null, { email: "zz-admin@example.com", password: "adminpass123" }));
    const owner = await signupOwner(1);

    // ---- auctioneer invite
    const inv = await call("POST", "/user/invite-auctioneer", admin, { name: "ZZ Auctioneer", email: "zz-auc@example.com" });
    check("admin invites an auctioneer and gets a link", inv.status === 201 && /\/invite\/[\w-]+$/.test(inv.json.link), inv.json.link);
    const token = inv.json.link.split("/invite/")[1];
    check("a team owner cannot invite anyone", (await call("POST", "/user/invite-auctioneer", owner.cookie, { name: "X", email: "zz-x@example.com" })).status === 403);
    check("inviting an email that already has an account is refused", (await call("POST", "/user/invite-auctioneer", admin, { name: "Dup", email: "zz-o1@example.com" })).status === 400);

    const info = await call("GET", `/auth/invite/${token}`);
    check("the invite page can read the invite", info.status === 200 && info.json.type === "auctioneer-invite" && info.json.email === "zz-auc@example.com");
    check("a made-up token is not valid", (await call("GET", "/auth/invite/not-a-real-token")).status === 404);
    check("a short password is refused", (await call("POST", "/auth/accept-invite", null, { token, password: "short" })).status === 400);
    const accepted = await call("POST", "/auth/accept-invite", null, { token, password: "aucpass1234" });
    check("accepting creates an auctioneer and signs them in", accepted.status === 201 && accepted.json.user.role === "auctioneer" && !!accepted.setCookie);
    check("the invite works only once", (await call("POST", "/auth/accept-invite", null, { token, password: "aucpass1234" })).status === 400);
    check("the new auctioneer can log in", (await call("POST", "/auth/login", null, { email: "zz-auc@example.com", password: "aucpass1234" })).status === 200);

    // ---- the login cookie lasts exactly as long as the token inside it
    const lifetime = await call("POST", "/auth/login", null, { email: "zz-auc@example.com", password: "aucpass1234" });
    const maxAge = Number(/Max-Age=(\d+)/i.exec(lifetime.setCookie || "")?.[1]);
    check("the login cookie's lifetime matches JWT_EXPIRES_IN", maxAge === parseDuration(process.env.JWT_EXPIRES_IN) / 1000, `${maxAge}s for JWT_EXPIRES_IN=${process.env.JWT_EXPIRES_IN}`);

    // ---- password reset
    const reset = await call("POST", "/user/reset-link", admin, { userId: owner.userId });
    check("admin creates a reset link for a user", reset.status === 201 && /\/reset\//.test(reset.json.link));
    const rt = reset.json.link.split("/reset/")[1];
    check("a reset token is not usable as an invite", (await call("POST", "/auth/accept-invite", null, { token: rt, password: "whatever123" })).status === 400);
    check("the reset works", (await call("POST", "/auth/reset-password", null, { token: rt, password: "newpass12345" })).status === 200);
    check("the old password stops working", (await call("POST", "/auth/login", null, { email: "zz-o1@example.com", password: "ownerpass123" })).status === 401);
    const relog = await call("POST", "/auth/login", null, { email: "zz-o1@example.com", password: "newpass12345" });
    check("the new password works", relog.status === 200);
    check("a reset link works only once", (await call("POST", "/auth/reset-password", null, { token: rt, password: "another12345" })).status === 400);
    check("login doesn't reveal whether an email exists", (await call("POST", "/auth/login", null, { email: "nobody@example.com", password: "x" })).json.message === (await call("POST", "/auth/login", null, { email: "zz-o1@example.com", password: "wrong" })).json.message);

    // ---- deactivate / reactivate
    const ownerCookie = cookieOf(relog);
    check("admin deactivates an account", (await call("POST", "/user/set-status", admin, { userId: owner.userId, status: "inactive" })).status === 200);
    check("a deactivated user cannot log in", (await call("POST", "/auth/login", null, { email: "zz-o1@example.com", password: "newpass12345" })).status === 403);
    check("...and a session they already had stops working", (await call("GET", "/auth/check-auth", ownerCookie)).status === 403);
    check("admin reactivates them", (await call("POST", "/user/set-status", admin, { userId: owner.userId, status: "active" })).status === 200);
    check("they can log in again", (await call("POST", "/auth/login", null, { email: "zz-o1@example.com", password: "newpass12345" })).status === 200);
    const me = (await call("GET", "/auth/check-auth", admin)).json.user;
    check("an admin cannot deactivate themselves", (await call("POST", "/user/set-status", admin, { userId: me._id, status: "inactive" })).status === 400);
    check("an admin cannot change their own role", (await call("POST", "/user/update-user-role", admin, { userId: me._id, role: "user" })).status === 400);

    // ---- who can see what
    check("public signup cannot create an admin", (await call("POST", "/auth/signup-team", null, { name: "Sneaky", email: "zz-sneaky@example.com", password: "sneakypass123", role: "admin", teamName: "ZZ Sneaky", shortName: "ZZS", logo: "x" })).json.user?.role === "user");
    check("a team owner cannot read the user list", (await call("GET", "/user/get-users", ownerCookie)).status === 403);
    check("the user list never contains password hashes", !(await call("GET", "/user/get-users", admin)).text.includes('"password"'));

    // ---- activity log
    const log = await call("GET", "/user/audit-log?limit=50", admin);
    const actions = (log.json.entries || []).map((e) => e.action);
    check("the activity log records the invite, the accept, the reset and the status changes",
        ["invite.auctioneer.created", "invite.accepted", "password.reset-link.created", "password.reset", "user.status.changed"].every((a) => actions.includes(a)), actions.join(", "));
    check("a team owner cannot read the activity log", (await call("GET", "/user/audit-log", ownerCookie)).status === 403);

    // ---- first-admin script
    const seed = (extra = {}) =>
        run("node", ["scripts/seedAdmin.js"], { env: { ...process.env, ADMIN_EMAIL: "zz-second@example.com", ADMIN_PASSWORD: "secondpass123", NODE_NO_WARNINGS: "1", ...extra } }).then(
            (r) => ({ code: 0, out: r.stdout + r.stderr }),
            (e) => ({ code: e.code, out: (e.stdout || "") + (e.stderr || "") })
        );
    const refused = await seed();
    check("the seed script refuses once an admin exists", refused.code === 1 && /already exists/.test(refused.out), refused.out.trim().split("\n")[0]);
    const forced = await seed({ ALLOW_ADDITIONAL_ADMIN: "1" });
    check("...unless recovery is explicitly requested", forced.code === 0 && /Created admin/.test(forced.out), forced.out.trim().split("\n")[0]);
} catch (error) {
    console.error("TEST ERROR:", error);
    check("suite ran without crashing", false);
}
await finish(clearDb);
