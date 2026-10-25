// Bidding: who may do what, the bid rules, purses, the clock (extension, pause/resume), sales, and the
// one-unfinished-auction-per-team rule.
import fs from "fs";
import { check, call, cookieOf, connectDb, clearDb, finish, signupOwner, connectSocket, waitEvent, sleep } from "./harness.mjs";
import User from "../../models/user.models.js";
import Player from "../../models/player.models.js";
import Auction from "../../models/auction.models.js";
import Team from "../../models/team.models.js";

await connectDb();
await clearDb();

try {
    const auctioneer = await User.create({ name: "ZZ Auctioneer", email: "zz-auc@example.com", password: "aucpass1234", role: "auctioneer" });
    await User.create({ name: "ZZ Other Auc", email: "zz-auc2@example.com", password: "aucpass1234", role: "auctioneer" });
    const login = async (email) => cookieOf(await call("POST", "/auth/login", null, { email, password: "aucpass1234" }));
    const aucCookie = await login("zz-auc@example.com");
    const otherAucCookie = await login("zz-auc2@example.com");
    const owners = [await signupOwner(1), await signupOwner(2), await signupOwner(3)];

    const template = JSON.parse(fs.readFileSync(new URL("../../config/playersData.json", import.meta.url), "utf8"))[0];
    const players = await Player.insertMany(
        [1000000, 1000000, 2000000, 1000000].map((basePrice, i) => ({ ...template, name: `ZZ Player ${i + 1}`, basePrice, status: "available", _id: undefined }))
    );
    const mkAuction = (name, list) =>
        Auction.create({
            name, season: 2099,
            startTime: new Date(Date.now() + 3600e3), endTime: new Date(Date.now() + 7200e3),
            auctioneer: auctioneer._id, status: "scheduled",
            players: list.map((p, i) => ({ player: p._id, status: "pending", order: i, set: "marquee" })),
            settings: { minBidIncrement: 100000, bidTimeLimit: 8, maxPursePerTeam: 40000000, minSquadSize: 2, maxSquadSize: 25 },
        });
    const auction = await mkAuction("ZZ Test Auction 1", players);
    const auction2 = await mkAuction("ZZ Test Auction 2", players.slice(0, 1));
    const A = String(auction._id);

    // ---- one unfinished auction per team
    const reg = (o, id) => call("POST", "/auction/register-to-auction", o.cookie, { auctionId: String(id), teamId: o.teamId });
    check("owners register for auction 1", (await Promise.all(owners.map((o) => reg(o, A)))).every((r) => r.status === 200));
    const conflict = await reg(owners[0], auction2._id);
    check("the same team cannot join a 2nd unfinished auction", conflict.status === 409, conflict.json.message);
    check("registering someone else's team is refused", (await call("POST", "/auction/register-to-auction", owners[0].cookie, { auctionId: String(auction2._id), teamId: owners[1].teamId })).status === 403);

    // ---- who may control an auction
    const visitor = await connectSocket(null);
    visitor.socket.emit("pauseAuction", { auctionId: A });
    check("a visitor cannot pause", !!(await waitEvent(visitor, "auctionError"))?.payload.message.match(/sign in/i));
    const ownerConn = await connectSocket(owners[0].cookie);
    ownerConn.socket.emit("playerSold", { auctionId: A });
    check("a team owner cannot sell a player", !!(await waitEvent(ownerConn, "auctionError"))?.payload.message.match(/not allowed/i));
    const otherConn = await connectSocket(otherAucCookie);
    otherConn.socket.emit("requestNextPlayer", { auctionId: A });
    check("an auctioneer not assigned to this auction is refused", !!(await waitEvent(otherConn, "auctionError"))?.payload.message.match(/not allowed/i));

    check("an unassigned auctioneer cannot start it", (await call("POST", `/auction/start-auction/${A}`, otherAucCookie, {})).status === 403);
    check("a team owner cannot start it", (await call("POST", `/auction/start-auction/${A}`, owners[0].cookie, {})).status === 403);
    const early = await call("POST", `/auction/start-auction/${A}`, aucCookie, {});
    check("even the assigned auctioneer cannot start it early", early.status === 400 && /start time/i.test(early.json.message), early.json.message);

    // ---- the auction opens (the scheduler does this at the start time); a joining client brings up player 1
    await Auction.updateOne({ _id: A }, { status: "active", currentPlayer: null });
    const watcher = await connectSocket(null);
    watcher.socket.emit("joinAuction", A);
    await waitEvent(watcher, "playerUpdate", 4000);
    const spectator = await connectSocket(null);
    spectator.socket.emit("joinAuction", A);
    const initial = await waitEvent(spectator, "initialData");
    const cur = initial?.payload.currentPlayer?.player;
    check("a spectator sees the current player", !!cur, cur?.name);
    const curId = String(cur?._id);
    const base = cur?.basePrice;

    // ---- bid rules
    const bid = (o, amount, id = curId) => call("POST", "/bids", o.cookie, { auctionId: A, playerId: id, teamId: o.teamId, amount });
    check("a bid below the base price is rejected", (await bid(owners[0], base - 100000)).status === 400);
    check("the first bid at the base price is accepted", (await bid(owners[0], base)).status === 201);
    check("the leader cannot outbid themself", (await bid(owners[0], base + 100000)).status === 400);
    check("an equal bid is rejected", (await bid(owners[1], base)).status === 400);
    check("a bid for the wrong player is rejected", (await bid(owners[1], base + 100000, String(players[3]._id))).status === 400);
    check("a visitor cannot bid", (await call("POST", "/bids", null, { auctionId: A, playerId: curId, teamId: owners[1].teamId, amount: base + 100000 })).status === 401);
    check("bidding for someone else's team is refused", (await call("POST", "/bids", owners[1].cookie, { auctionId: A, playerId: curId, teamId: owners[0].teamId, amount: base + 100000 })).status === 403);

    let doc = await Auction.findById(A);
    check("a bid does NOT reduce the purse", doc.teams.find((t) => String(t.team) === owners[0].teamId).purseRemaining === 40000000);

    const [r2, r3] = await Promise.all([bid(owners[1], base + 100000), bid(owners[2], base + 100000)]);
    check("two simultaneous equal bids: exactly one wins", [r2, r3].filter((r) => r.status === 201).length === 1, `${r2.status}/${r3.status}`);
    doc = await Auction.findById(A);
    check("only one of them was recorded", doc.bids.filter((b) => b.amount === base + 100000).length === 1);
    const over = await bid(owners[0], 41000000);
    check("a bid above the purse is rejected", over.status === 400 && /purse/i.test(over.json.message), over.json.message);

    doc = await Auction.findById(A);
    const remaining = doc.timeRemaining.getTime() - Date.now();
    check("a bid in the last 10s extends the 8s clock to about 10s", remaining > 7000 && remaining <= 10500, `${Math.round(remaining)}ms`);

    // ---- pause / resume
    await sleep(1500);
    ownerConn.socket.emit("pauseAuction", { auctionId: A });
    check("a team owner cannot pause", !!(await waitEvent(ownerConn, "auctionError", 1500, 1)));
    const aucConn = await connectSocket(aucCookie);
    aucConn.socket.emit("pauseAuction", { auctionId: A });
    await sleep(700);
    doc = await Auction.findById(A);
    check("the assigned auctioneer pauses", doc.status === "paused", `${doc.pausedTimeRemaining}s frozen`);
    const frozen = doc.pausedTimeRemaining;
    const pausedBid = await bid(owners[0], base + 500000);
    check("bids are refused while paused", pausedBid.status === 400 && /paused/i.test(pausedBid.json.message), pausedBid.json.message);
    await sleep((frozen + 2) * 1000);
    doc = await Auction.findById(A);
    check("a paused auction does not sell its player", String(doc.currentPlayer) === curId && doc.results.length === 0);
    aucConn.socket.emit("resumeAuction", { auctionId: A });
    await sleep(700);
    doc = await Auction.findById(A);
    const afterResume = doc.timeRemaining.getTime() - Date.now();
    check("resume carries on with the frozen time", doc.status === "active" && Math.abs(afterResume - frozen * 1000) < 2500, `${Math.round(afterResume)}ms (froze at ${frozen}s)`);

    // ---- the sale
    const leaderBid = doc.currentBid;
    await sleep(Math.max(0, doc.timeRemaining.getTime() - Date.now()) + 2500);
    doc = await Auction.findById(A);
    check("expiry sold the player", doc.results.length === 1 && String(doc.results[0].player) === curId);
    check("sold to the highest bidder at their price", String(doc.results[0]?.soldTo) === String(leaderBid.team) && doc.results[0]?.amount === leaderBid.amount);
    const winnerEntry = doc.teams.find((t) => String(t.team) === String(leaderBid.team));
    check("the purse dropped by the sale price only", winnerEntry.purseRemaining === 40000000 - leaderBid.amount, String(winnerEntry.purseRemaining));
    check("the squad count went up by one", winnerEntry.playersAcquired === 1);
    const winnerTeam = await Team.findById(leaderBid.team);
    check("the squad records which auction it was won in", String(winnerTeam.players.find((p) => String(p.player) === curId)?.auction) === A);
    check("the team's own per-auction purse matches", winnerTeam.registeredAuction.find((r) => String(r.auctionId) === A)?.purseRemaining === winnerEntry.purseRemaining);
    check("the next player is up with a fresh clock", !!doc.currentPlayer && String(doc.currentPlayer) !== curId && doc.timeRemaining.getTime() > Date.now());

    // ---- selling early uses the server's numbers, never the client's
    const next = doc.currentPlayer.toString();
    const nextBase = (await Player.findById(next)).basePrice;
    check("a bid on the next player", (await bid(owners[2], nextBase, next)).status === 201);
    aucConn.socket.emit("playerSold", { auctionId: A, playerId: next, teamId: owners[0].teamId, amount: 1 });
    await sleep(1200);
    doc = await Auction.findById(A);
    const sold2 = doc.results.find((r) => String(r.player) === next);
    check("a manual sale ignores the client's team and amount", !!sold2 && String(sold2.soldTo) === owners[2].teamId && sold2.amount === nextBase);

    // ---- an extension must hold back the RUNNING clock too
    doc = await Auction.findById(A);
    const third = String(doc.currentPlayer);
    const thirdBase = (await Player.findById(third)).basePrice;
    const originalEnd = doc.timeRemaining.getTime();
    await sleep(Math.max(0, originalEnd - Date.now() - 2000));
    check("a late bid (2s left) is accepted", (await bid(owners[1], thirdBase, third)).status === 201);
    const extendedEnd = (await Auction.findById(A)).timeRemaining.getTime();
    check("the end time moves out", extendedEnd > originalEnd + 5000, `+${Math.round((extendedEnd - originalEnd) / 1000)}s`);
    await sleep(Math.max(0, originalEnd - Date.now()) + 1800);
    doc = await Auction.findById(A);
    check("the player is NOT sold at the original end time", String(doc.currentPlayer) === third && !doc.results.some((r) => String(r.player) === third));
    await sleep(Math.max(0, extendedEnd - Date.now()) + 2500);
    doc = await Auction.findById(A);
    check("the player IS sold at the extended end time", doc.results.some((r) => String(r.player) === third && String(r.soldTo) === owners[1].teamId));

    // ---- finishing, and what it frees up
    check("a team owner cannot complete the auction", (await call("POST", `/auction/complete-auction/${A}`, owners[0].cookie, {})).status === 403);
    const done = await call("POST", `/auction/complete-auction/${A}`, aucCookie, {});
    check("the assigned auctioneer completes it", done.status === 200, done.json.message);
    const rejoin = await reg(owners[0], auction2._id);
    check("after completion the team can join another auction", rejoin.status === 200, rejoin.json.message);
    const afterTeam = await Team.findById(owners[0].teamId);
    check("the squad carries over and the new purse is fresh", afterTeam.registeredAuction.find((r) => String(r.auctionId) === String(auction2._id))?.purseRemaining === 40000000);
} catch (error) {
    console.error("TEST ERROR:", error);
    check("suite ran without crashing", false);
}
await finish(clearDb);
