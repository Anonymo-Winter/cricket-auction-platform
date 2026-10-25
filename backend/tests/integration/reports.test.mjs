// Read-only reports: team purses, squads, the CSV export, auction stats, and the timer payload the screens rely on.
import fs from "fs";
import { check, call, connectDb, clearDb, finish, connectSocket, sleep } from "./harness.mjs";
import User from "../../models/user.models.js";
import Player from "../../models/player.models.js";
import Auction from "../../models/auction.models.js";
import Team from "../../models/team.models.js";

await connectDb();
await clearDb();

try {
    const tpl = JSON.parse(fs.readFileSync(new URL("../../config/playersData.json", import.meta.url), "utf8"))[0];
    const mkP = (name, basePrice, role, nationality) => ({ ...tpl, name, basePrice, role, nationality, status: "available", _id: undefined });
    const ps = await Player.insertMany([
        mkP("ZZ Star", 2000000, "batsman", "Indian"),
        mkP("ZZ Quick", 1000000, "bowler", "Australian"),
        mkP("=Evil()", 1000000, "all-rounder", "Indian"),
        mkP("ZZ Nobody", 1000000, "bowler", "Indian"),
        mkP("ZZ Comma, Jr", 1500000, "batsman", "Indian"),
    ]);
    const owners = await User.insertMany([1, 2, 3].map((i) => ({ name: `ZZ O${i}`, email: `zz-o${i}@example.com`, password: "ownerpass123", role: "user" })));
    const teams = await Team.insertMany([["ZZ Alpha", "ZZA"], ["ZZ Beta", "ZZB"], ["ZZ Gamma", "ZZG"]].map(([name, shortName], i) => ({ name, shortName, logo: "x", owner: owners[i]._id, theme: "blue" })));
    const now = new Date();
    const a = await Auction.create({
        name: "ZZ Reports Auction, 2099", season: 2099, startTime: now, endTime: new Date(now.getTime() + 3600e3), status: "completed",
        players: ps.map((p, i) => ({ player: p._id, status: i === 3 ? "unsold" : "sold", order: i, set: "marquee" })),
        teams: teams.map((t, i) => ({ team: t._id, purseRemaining: 100000000 - [30000000, 12000000, 0][i], playersAcquired: [2, 2, 0][i], isActive: true })),
        results: [
            { player: ps[0]._id, soldTo: teams[0]._id, amount: 25000000, timestamp: now },
            { player: ps[1]._id, soldTo: teams[1]._id, amount: 8000000, timestamp: now },
            { player: ps[2]._id, soldTo: teams[0]._id, amount: 5000000, timestamp: now },
            { player: ps[4]._id, soldTo: teams[1]._id, amount: 4000000, timestamp: now },
        ],
        settings: { maxPursePerTeam: 100000000 },
    });
    const id = String(a._id);

    const summary = await call("GET", `/auction/${id}/teams-summary`);
    check("the teams summary lists every team with its purse", summary.status === 200 && summary.json.teams.length === 3 && summary.json.teams.find((t) => t.shortName === "ZZA").purseRemaining === 70000000);
    check("an unknown or malformed auction id is a 404", (await call("GET", "/auction/000000000000000000000000/teams-summary")).status === 404 && (await call("GET", "/auction/not-an-id/teams-summary")).status === 404);

    const sq = await call("GET", `/auction/${id}/squads`);
    const byShort = (s) => sq.json.teams.find((t) => t.team.shortName === s);
    check("squads: Alpha bought 2 for 30M, the biggest buy first", byShort("ZZA").squadSize === 2 && byShort("ZZA").totalSpent === 30000000 && byShort("ZZA").players[0].name === "ZZ Star");
    check("squads: overseas is counted by nationality", byShort("ZZB").overseas === 1 && byShort("ZZA").overseas === 0);
    check("squads: a team with no buys is still listed", byShort("ZZG").squadSize === 0);
    check("squads: teams are ordered by spend", sq.json.teams[0].team.shortName === "ZZA");
    check("squads: unsold players are listed", sq.json.unsold.length === 1 && sq.json.unsold[0].name === "ZZ Nobody");

    const csv = await call("GET", `/auction/${id}/squads.csv`);
    check("the CSV is a download with a safe filename", csv.status === 200 && /text\/csv/.test(csv.headers.get("content-type")) && /attachment; filename="zz-reports-auction-2099-squads\.csv"/.test(csv.headers.get("content-disposition")));
    check("the CSV has a header, a row per player and one for unsold", csv.text.split("\r\n").filter(Boolean).length === 1 + 4 + 1);
    check("the CSV quotes commas", csv.text.includes('"ZZ Comma, Jr"') && csv.text.includes('"ZZ Reports Auction, 2099"'));
    check("the CSV neutralises spreadsheet formulas", csv.text.includes("'=Evil()") && !/,=Evil\(\)/.test(csv.text));

    const one = await call("GET", `/stats/auction/${id}`);
    const t = one.json.totals;
    check("stats: totals", t.sold === 4 && t.totalSpent === 42000000 && t.averagePrice === 10500000 && t.unsold === 1, JSON.stringify(t));
    check("stats: Indian vs overseas", t.overseasSold === 1 && t.indianSold === 3);
    check("stats: the most expensive buy is first", one.json.mostExpensive[0].player === "ZZ Star" && one.json.mostExpensive[0].price === 25000000);
    check("stats: the biggest spender is Alpha", one.json.biggestSpenders[0].team === "ZZ Alpha" && one.json.biggestSpenders[0].spent === 30000000);
    check("stats: premiums over base price (1150%, then 700%)", one.json.biggestPremium[0].premiumPercent === 1150 && one.json.biggestPremium[1].premiumPercent === 700);
    check("stats: spend by role", one.json.byRole.find((r) => r.role === "batsman").sold === 2);
    check("stats: unsold players are named", one.json.unsoldPlayers.some((p) => p.name === "ZZ Nobody"));
    check("stats: an unknown auction is a 404", (await call("GET", "/stats/auction/not-an-id")).status === 404);
    check("stats: the overview includes it", (await call("GET", "/stats/overview")).json.totals.sold >= 4);

    // every timer sync has the same shape, however it was triggered
    await Auction.updateOne({ _id: id }, { status: "active", currentPlayer: ps[3]._id, timeRemaining: new Date(Date.now() + 20000) });
    const conn = await connectSocket(null);
    conn.socket.emit("joinAuction", id);
    await sleep(1500);
    const syncs = conn.events.filter((e) => e.name === "timerSync").map((e) => e.payload);
    check("timerSync always has endTime, whole seconds and the server clock",
        syncs.length > 0 && syncs.every((p) => p.endTime && Number.isFinite(p.timeRemaining) && p.timeRemaining <= 20 && Math.abs(p.serverTime - Date.now()) < 5000), `${syncs.length} syncs`);
    conn.socket.disconnect();
    await sleep(500);

    // the number of people watching, sent to everyone in the auction's room
    const viewerCounts = (c) => c.events.filter((e) => e.name === "viewerCount").map((e) => e.payload.count);
    const viewerA = await connectSocket(null);
    const viewerB = await connectSocket(null);
    viewerA.socket.emit("joinAuction", id);
    await sleep(600);
    viewerB.socket.emit("joinAuction", id);
    await sleep(800);
    check("joining raises the viewer count for everyone watching", viewerCounts(viewerA).includes(2) && viewerCounts(viewerB).includes(2), `A saw ${viewerCounts(viewerA)}, B saw ${viewerCounts(viewerB)}`);
    viewerB.socket.disconnect();
    await sleep(800);
    check("leaving lowers it again", viewerCounts(viewerA).at(-1) === 1, `A's last count: ${viewerCounts(viewerA).at(-1)}`);
    viewerA.socket.disconnect();
} catch (error) {
    console.error("TEST ERROR:", error);
    check("suite ran without crashing", false);
}
await finish(clearDb);
