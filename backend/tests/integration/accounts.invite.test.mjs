// Invite-only signup mode (the runner starts this suite's server with SIGNUP_MODE=invite).
import { check, call, cookieOf, connectDb, clearDb, finish } from "./harness.mjs";
import User from "../../models/user.models.js";

await connectDb();
await clearDb();

const signup = (email, short, extra = {}) =>
    call("POST", "/auth/signup-team", null, { name: "ZZ Owner", email, password: "ownerpass123", teamName: `ZZ ${short}`, shortName: short, logo: "x", ...extra });

try {
    await User.create({ name: "ZZ Admin", email: "zz-admin@example.com", password: "adminpass123", role: "admin" });
    const admin = cookieOf(await call("POST", "/auth/login", null, { email: "zz-admin@example.com", password: "adminpass123" }));

    check("the server reports invite-only mode", (await call("GET", "/auth/signup-config")).json.mode === "invite");
    const nope = await signup("zz-a@example.com", "ZZA");
    check("signing up without an invite is refused", nope.status === 403 && /invite-only/i.test(nope.json.message), nope.json.message);

    const inv = await call("POST", "/user/invite-owner", admin, { email: "zz-b@example.com" });
    check("admin creates an owner invite locked to an email", inv.status === 201 && /signup\?invite=/.test(inv.json.link));
    const token = inv.json.link.split("invite=")[1];
    const info = await call("GET", `/auth/invite/${token}`);
    check("the signup page can read the invite", info.json.type === "owner-invite" && info.json.email === "zz-b@example.com");

    const wrong = await signup("zz-other@example.com", "ZZO", { inviteToken: token });
    check("the invite can't be used with a different email", wrong.status === 403, wrong.json.message);
    check("...and that failed attempt did not use it up", (await call("GET", `/auth/invite/${token}`)).status === 200);

    const ok = await signup("zz-b@example.com", "ZZB", { inviteToken: token });
    check("the right email can sign up", ok.status === 201 && ok.json.user.role === "user" && !!ok.json.team?._id, ok.json.message);
    const again = await signup("zz-c@example.com", "ZZC", { inviteToken: token });
    check("an invite works only once", again.status === 403);

    const open = await call("POST", "/user/invite-owner", admin, {});
    const t2 = open.json.link.split("invite=")[1];
    check("an invite with no email works for anyone", (await signup("zz-d@example.com", "ZZD", { inviteToken: t2 })).status === 201);
    check("a random made-up token does not work", (await signup("zz-e@example.com", "ZZE", { inviteToken: "made-up" })).status === 403);
    check("a team owner cannot create invites", (await call("POST", "/user/invite-owner", cookieOf(await call("POST", "/auth/login", null, { email: "zz-b@example.com", password: "ownerpass123" })), {})).status === 403);
} catch (error) {
    console.error("TEST ERROR:", error);
    check("suite ran without crashing", false);
}
await finish(clearDb);
