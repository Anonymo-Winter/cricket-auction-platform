// Admin setup: auction validation, what can be edited and when, busy teams, the public list, and CSV import.
import { check, call, cookieOf, connectDb, clearDb, finish, signupOwner, future } from "./harness.mjs";
import User from "../../models/user.models.js";
import Player from "../../models/player.models.js";
import Auction from "../../models/auction.models.js";

await connectDb();
await clearDb();

try {
    await User.create({ name: "ZZ Admin", email: "zz-admin@example.com", password: "adminpass123", role: "admin" });
    const admin = cookieOf(await call("POST", "/auth/login", null, { email: "zz-admin@example.com", password: "adminpass123" }));
    const owners = [await signupOwner(1), await signupOwner(2)];

    // ---- creating an auction
    const base = { name: "ZZ Created Auction", season: 2099, startTime: future(60), endTime: future(180) };
    const create = (over) => call("POST", "/auction/create-new-auction", admin, { ...base, ...over });
    check("a start time in the past is rejected", (await create({ startTime: future(-30) })).status === 400);
    const naive = await create({ startTime: "2099-10-22T18:00", endTime: "2099-10-22T21:00" });
    check("a time with no timezone is refused (it would mean a different moment in each timezone)", naive.status === 400 && /timezone/i.test(naive.json.message), naive.json.message);
    check("an offset time is accepted and stored as the exact instant", (await create({ name: "ZZ Offset Auction", startTime: "2099-10-22T18:00:00+05:30", endTime: "2099-10-22T21:00:00+05:30" })).status < 300 && (await Auction.findOne({ name: "ZZ Offset Auction" }))?.startTime.toISOString() === "2099-10-22T12:30:00.000Z");
    check("an end before the start is rejected", (await create({ endTime: future(30) })).status === 400);
    const badSquad = await create({ settings: { minSquadSize: 20, maxSquadSize: 10 } });
    check("a min squad above the max is rejected", badSquad.status === 400, badSquad.json.message);
    check("a 1-second bid clock is rejected", (await create({ settings: { bidTimeLimit: 1 } })).status === 400);
    check("non-numeric rules are rejected", (await create({ settings: { minBidIncrement: "lots" } })).status === 400);
    check("a team owner cannot create an auction", (await call("POST", "/auction/create-new-auction", owners[0].cookie, base)).status === 403);
    const ok = await create({ settings: { bidTimeLimit: "45", maxPursePerTeam: "500000000" } });
    check("a valid auction is created", ok.status === 201 || ok.status === 200, ok.json.message);
    const doc = await Auction.findOne({ name: "ZZ Created Auction" });
    check("the rules are stored as numbers", doc.settings.bidTimeLimit === 45 && doc.settings.maxPursePerTeam === 500000000);
    check("the clock is a real date, not 1970", doc.timeRemaining.getFullYear() >= 2025, String(doc.timeRemaining));
    const ID = String(doc._id);

    // ---- editing it
    const update = (data) => call("PATCH", "/auction/update-auction", admin, { id: ID, updatedData: data });
    check("status cannot be forced to active", (await update({ status: "active" })).status === 400);
    check("an edit with a time that has no timezone is refused", (await update({ startTime: "2099-10-22T18:00" })).status === 400);
    check("rules can be edited while scheduled", (await update({ minBidIncrement: 200000 })).status === 200);
    check("...and the change is saved", (await Auction.findById(ID)).settings.minBidIncrement === 200000);
    check("a scheduled auction can be cancelled", (await update({ status: "cancelled" })).status === 200);
    check("rescheduling needs a future start time", (await update({ status: "scheduled", startTime: future(-10), endTime: future(100) })).status === 400);
    check("a cancelled auction can be rescheduled", (await update({ status: "scheduled", startTime: future(90), endTime: future(200) })).status === 200);
    await Auction.updateOne({ _id: ID }, { status: "active" });
    check("times and rules lock once it has opened", (await update({ minBidIncrement: 300000 })).status === 400);
    check("...but the name can still change", (await update({ name: "ZZ Created Auction renamed" })).status === 200);
    await Auction.updateOne({ _id: ID }, { status: "scheduled", name: "ZZ Created Auction" });
    check("a team owner cannot edit an auction", (await call("PATCH", "/auction/update-auction", owners[0].cookie, { id: ID, updatedData: { name: "hacked" } })).status === 403);

    // ---- teams
    check("team 1 joins the new auction", (await call("POST", "/auction/register-to-auction", owners[0].cookie, { auctionId: ID, teamId: owners[0].teamId })).status === 200);
    const other = await Auction.create({ name: "ZZ Other Auction", season: 2099, startTime: new Date(Date.now() + 7200e3), endTime: new Date(Date.now() + 9000e3), status: "scheduled", players: [], teams: [] });
    const ids = ((await call("GET", `/auction/getAllAvailableTeams/${other._id}`)).json.data || []).map((t) => String(t._id));
    check("a team already in another unfinished auction is not offered", !ids.includes(owners[0].teamId) && ids.includes(owners[1].teamId));
    const added = await call("PATCH", `/auction/add-teams-to-auction/${other._id}`, admin, { teams: [owners[0].teamId] });
    check("...and an admin cannot add it by hand either", added.status === 409, added.json.message);

    // ---- the public list
    const card = ((await call("GET", "/auctions")).json || []).find((a) => a.name === "ZZ Created Auction");
    check("the public list carries rules and counts", card?.settings?.bidTimeLimit === 45 && card.teamCount === 1 && card.playerCount === 0);

    // ---- CSV import
    const rows = [
        { name: "ZZ Import Good", dateOfBirth: "1995-06-15", nationality: "Indian", role: "Batter", battingStyle: "right", bowlingStyle: "", iplDebut: "2019", matches: "40", basePrice: "2cr", isUncapped: "no" },
        { name: "ZZ Import Spinner", dateOfBirth: "15/06/1996", nationality: "Indian", role: "all rounder", battingStyle: "left-handed", bowlingStyle: "right arm leg spin", iplDebut: "2020", basePrice: "50L" },
        { name: "ZZ Import Bad", dateOfBirth: "not a date", nationality: "", role: "chef", battingStyle: "right", iplDebut: "1999", basePrice: "free" },
        { name: "ZZ Import Good", dateOfBirth: "1995-06-15", nationality: "Indian", role: "batsman", battingStyle: "right-handed", iplDebut: "2019", basePrice: "20000000" },
    ];
    const dry = await call("POST", "/player/import", admin, { rows, dryRun: true });
    check("a dry run reports 2 valid, 1 duplicate, 1 invalid", dry.json.summary?.valid === 2 && dry.json.summary?.duplicate === 1 && dry.json.summary?.invalid === 1, JSON.stringify(dry.json.summary));
    check("a dry run saves nothing", (await Player.countDocuments({ name: /^ZZ Import/ })) === 0);
    check("an invalid row explains every problem", (dry.json.rows?.[2]?.errors || []).length >= 4);
    check("a team owner cannot import players", (await call("POST", "/player/import", owners[0].cookie, { rows, dryRun: true })).status === 403);
    check("too many rows are refused", (await call("POST", "/player/import", admin, { rows: Array(501).fill(rows[0]) })).status === 400);
    const real = await call("POST", "/player/import", admin, { rows });
    check("the import creates the 2 valid players", real.json.created === 2);
    const good = await Player.findOne({ name: "ZZ Import Good" });
    check("'2cr' became 20,000,000 and 'Batter' became batsman", good?.basePrice === 20000000 && good?.role === "batsman" && good?.isUncapped === false);
    check("'right arm leg spin' was accepted", (await Player.findOne({ name: "ZZ Import Spinner" }))?.bowlingStyle === "right-arm-leg-spin");
    const again = await call("POST", "/player/import", admin, { rows: rows.slice(0, 2) });
    check("importing the same file again creates nothing", again.json.created === 0 && again.json.summary?.duplicate === 2);
} catch (error) {
    console.error("TEST ERROR:", error);
    check("suite ran without crashing", false);
}
await finish(clearDb);
