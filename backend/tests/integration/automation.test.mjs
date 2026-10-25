// A whole auction with NO auctioneer running itself: bids, an admin undo and pause, sale, unsold players, the owners'
// vote, the extra round, and automatic completion. Plus the rules for resuming and for starting early. Takes ~2 minutes
// because it plays in real time (5-second clock).
import fs from "fs";
import { check, call, cookieOf, connectDb, clearDb, finish, signupOwner, connectSocket, waitEvent, sleep } from "./harness.mjs";
import User from "../../models/user.models.js";
import Player from "../../models/player.models.js";
import Auction from "../../models/auction.models.js";
import Team from "../../models/team.models.js";
import AuctionHistory from "../../models/auctionHistory.models.js";

await connectDb();
await clearDb();

try {
    await User.create({ name: "ZZ Admin", email: "zz-admin@example.com", password: "adminpass123", role: "admin" });
    const admin = cookieOf(await call("POST", "/auth/login", null, { email: "zz-admin@example.com", password: "adminpass123" }));
    const owners = [await signupOwner(1), await signupOwner(2), await signupOwner(3)];
    const [, o2, o3] = owners;

    const template = JSON.parse(fs.readFileSync(new URL("../../config/playersData.json", import.meta.url), "utf8"))[0];
    const players = await Player.insertMany([1, 2, 3].map((i) => ({ ...template, name: `ZZ Player ${i}`, basePrice: 1000000, status: "available", _id: undefined })));
    const auto = await Auction.create({
        name: "ZZ Auto Auction", season: 2099,
        startTime: new Date(Date.now() + 3600e3), endTime: new Date(Date.now() + 7200e3),
        status: "scheduled", auctioneer: null,
        players: players.map((p, i) => ({ player: p._id, status: "pending", order: i, set: "marquee" })),
        settings: { minBidIncrement: 100000, bidTimeLimit: 5, maxPursePerTeam: 40000000, minSquadSize: 1, maxSquadSize: 25 },
    });
    const AID = String(auto._id);
    for (const o of [o2, o3]) {
        const r = await call("POST", "/auction/register-to-auction", o.cookie, { auctionId: AID, teamId: o.teamId });
        if (r.status !== 200) throw new Error("register failed: " + JSON.stringify(r.json));
    }

    // ---- starting rules
    const early = await call("POST", `/auction/start-auction/${AID}`, admin, {});
    check("nobody, not even an admin, can start a scheduled auction early", early.status === 400 && /start time/i.test(early.json.message), early.json.message);
    check("...and it is still scheduled", (await Auction.findById(AID)).status === "scheduled");

    // ---- the scheduler opens it at the start time; open it directly, then a joining client brings up player 1
    await Auction.updateOne({ _id: AID }, { status: "active", currentPlayer: null });
    const adminConn = await connectSocket(admin);
    const watcher = await connectSocket(o2.cookie);
    const spectator = await connectSocket(null);
    watcher.socket.emit("joinAuction", AID);
    await sleep(1500);
    let doc = await Auction.findById(AID);
    check("player 1 is up with no auctioneer assigned", !!doc.currentPlayer && doc.status === "active");
    const p1 = String(doc.currentPlayer);

    const bid = (o, amount, pid) => call("POST", "/bids", o.cookie, { auctionId: AID, playerId: pid, teamId: o.teamId, amount });
    const base = (await Player.findById(p1)).basePrice;
    check("owner 2 bids", (await bid(o2, base, p1)).status === 201);
    check("owner 3 outbids", (await bid(o3, base + 100000, p1)).status === 201);
    spectator.socket.emit("undoLastBid", { auctionId: AID });
    check("a spectator cannot undo a bid", !!(await waitEvent(spectator, "auctionError", 1500)));
    watcher.socket.emit("undoLastBid", { auctionId: AID });
    check("a team owner cannot undo a bid", !!(await waitEvent(watcher, "auctionError", 1500)));
    adminConn.socket.emit("undoLastBid", { auctionId: AID });
    await sleep(800);
    doc = await Auction.findById(AID);
    check("an admin undoes the last bid", String(doc.currentBid?.team) === o2.teamId && doc.currentBid.amount === base && doc.bids.filter((x) => String(x.player) === p1).length === 1);

    adminConn.socket.emit("pauseAuction", { auctionId: AID });
    await sleep(600);
    check("an admin can pause with no auctioneer assigned", (await Auction.findById(AID)).status === "paused");
    const resumed = await call("POST", `/auction/start-auction/${AID}`, admin, {});
    doc = await Auction.findById(AID);
    check("an admin can resume a paused auction", resumed.status === 200 && doc.status === "active", resumed.json.message);
    check("it carries on with the time that was left", doc.timeRemaining.getTime() > Date.now());
    check("owner 3 bids again", (await bid(o3, base + 100000, p1)).status === 201);

    // player 1 sells to owner 3, players 2 and 3 go unsold, then the vote starts by itself
    const pollStart = await waitEvent(watcher, "userPoll", 40000);
    doc = await Auction.findById(AID);
    check("player 1 sold to the highest bidder", doc.results.length === 1 && String(doc.results[0].soldTo) === o3.teamId && String(doc.results[0].player) === p1);
    check("players 2 and 3 went unsold", doc.players.filter((p) => p.status === "unsold").length === 2);
    check("the owners' vote started by itself", !!pollStart, pollStart ? `${pollStart.payload.unsoldPlayers.length} players offered` : "no poll");
    check("the auction waits during the vote", doc.status === "waiting");

    const target = pollStart.payload.unsoldPlayers[0];
    watcher.socket.emit("submitPollVote", { auctionId: AID, playerIds: [String(target._id)] });
    spectator.socket.emit("submitPollVote", { auctionId: AID, playerIds: [String(target._id)] });
    check("a spectator's vote is refused", !!(await waitEvent(spectator, "error", 1500)));
    const closed = await waitEvent(watcher, "pollCompleted", 40000);
    check("the vote closed by itself with the owner's vote counted", !!closed && closed.payload.totalVotes === 1);
    await sleep(1500);
    doc = await Auction.findById(AID).populate("players.player");
    const target2 = doc.players.find((p) => String(p._id) === String(target._id));
    check("the voted player came back in round 2", doc.currentRound === 2 && String(doc.currentPlayer) === String(target2.player._id) && doc.status === "active", `round ${doc.currentRound}, ${doc.status}`);

    // nobody bids in round 2: the auction completes and archives itself
    for (let i = 0; i < 40 && doc.status !== "completed"; i++) {
        await sleep(1000);
        doc = await Auction.findById(AID);
    }
    check("the auction completed by itself", doc.status === "completed", doc.status);
    const history = await AuctionHistory.findById(AID);
    check("its results were archived", !!history && history.summary.totalPlayersSold === 1);
    check("the winner's squad kept the player, tagged with the auction", (await Team.findById(o3.teamId)).players.some((p) => String(p.player) === p1 && String(p.auction) === AID));
    const free = await Auction.create({ name: "ZZ Next Auction", season: 2099, startTime: new Date(Date.now() + 7200e3), endTime: new Date(Date.now() + 9000e3), status: "scheduled", players: [], teams: [] });
    check("a team from a completed auction can join another", (await call("POST", "/auction/register-to-auction", o2.cookie, { auctionId: String(free._id), teamId: o2.teamId })).status === 200);

    // ---- completing by hand
    const manual = await Auction.create({ name: "ZZ Manual Complete", season: 2099, startTime: new Date(Date.now() + 3600e3), endTime: new Date(Date.now() + 7200e3), status: "paused", players: [], teams: [] });
    check("a team owner cannot complete an auction", (await call("POST", `/auction/complete-auction/${manual._id}`, owners[0].cookie, {})).status === 403);
    const done = await call("POST", `/auction/complete-auction/${manual._id}`, admin, {});
    check("an admin can complete one by hand", done.status === 200 && (await Auction.findById(manual._id)).status === "completed", done.json.message);
} catch (error) {
    console.error("TEST ERROR:", error);
    check("suite ran without crashing", false);
}
await finish(clearDb);
