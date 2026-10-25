// Rounds: a player skipped AFTER receiving a bid, brought back by the owners' vote and not bid on again must end
// unsold. (A bug once let the old bid from the first round decide the sale.) Plays in real time: ~50 seconds.
import fs from "fs";
import { check, call, cookieOf, connectDb, clearDb, finish, signupOwner, connectSocket, waitEvent, sleep } from "./harness.mjs";
import User from "../../models/user.models.js";
import Player from "../../models/player.models.js";
import Auction from "../../models/auction.models.js";
import AuctionHistory from "../../models/auctionHistory.models.js";
import Team from "../../models/team.models.js";

await connectDb();
await clearDb();

try {
    await User.create({ name: "ZZ Admin", email: "zz-admin@example.com", password: "adminpass123", role: "admin" });
    const admin = cookieOf(await call("POST", "/auth/login", null, { email: "zz-admin@example.com", password: "adminpass123" }));
    const o1 = await signupOwner(1);

    const tpl = JSON.parse(fs.readFileSync(new URL("../../config/playersData.json", import.meta.url), "utf8"))[0];
    const [p1, p2] = await Player.insertMany([1, 2].map((i) => ({ ...tpl, name: `ZZ Player ${i}`, basePrice: 1000000, status: "available", _id: undefined })));
    const settings = { minBidIncrement: 100000, bidTimeLimit: 5, maxPursePerTeam: 40000000, minSquadSize: 1, maxSquadSize: 25 };
    const mk = (name, status, list) =>
        Auction.create({
            name, season: 2099, startTime: new Date(Date.now() + 3600e3), endTime: new Date(Date.now() + 7200e3), status,
            players: list.map((p, i) => ({ player: p._id, status: "pending", order: i, set: "marquee" })),
            teams: [{ team: o1.teamId, purseRemaining: settings.maxPursePerTeam, playersAcquired: 0, isActive: true }],
            settings,
        });

    // ---- a scheduled auction has no running clock, so it sends none
    const scheduled = await mk("ZZ Scheduled", "scheduled", [p1]);
    const early = await connectSocket(null);
    early.socket.emit("joinAuction", String(scheduled._id));
    await sleep(1500);
    check("a scheduled auction sends no timer sync (it has no running clock)", !early.events.some((e) => e.name === "timerSync"), `${early.events.filter((e) => e.name === "timerSync").length} sent`);
    early.socket.disconnect();

    // ---- the real flow
    const a = await mk("ZZ Rounds Auction", "scheduled", [p1, p2]);
    const A = String(a._id);
    await Team.updateOne({ _id: o1.teamId }, { $push: { registeredAuction: { auctionId: a._id, purseRemaining: settings.maxPursePerTeam } } });
    await Auction.updateOne({ _id: A }, { status: "active", currentPlayer: null });

    const adminConn = await connectSocket(admin);
    const ownerConn = await connectSocket(o1.cookie);
    ownerConn.socket.emit("joinAuction", A);
    await waitEvent(ownerConn, "playerUpdate", 4000);
    let doc = await Auction.findById(A);
    check("player 1 is up", String(doc.currentPlayer) === String(p1._id));

    const bid = await call("POST", "/bids", o1.cookie, { auctionId: A, playerId: String(p1._id), teamId: o1.teamId, amount: 1000000 });
    check("the owner bids on player 1", bid.status === 201);

    adminConn.socket.emit("skipPlayer", { auctionId: A });
    await sleep(1200);
    doc = await Auction.findById(A);
    check("the admin skips player 1: he is unsold and player 2 is up", doc.players[0].status === "unsold" && String(doc.currentPlayer) === String(p2._id));
    check("the skipped player's bid is still in the bid history (this is what must not matter later)", doc.bids.filter((b) => String(b.player) === String(p1._id)).length === 1);
    check("the live bid was cleared for player 2", !doc.currentBid?.amount);

    // player 2 gets no bids and goes unsold; then the owners' vote opens by itself
    const poll = await waitEvent(ownerConn, "userPoll", 45000);
    check("the owners' vote opened by itself", !!poll, poll ? `${poll.payload.unsoldPlayers.length} unsold players offered` : "no vote");
    const entry = poll.payload.unsoldPlayers.find((p) => String(p.player._id) === String(p1._id));
    ownerConn.socket.emit("submitPollVote", { auctionId: A, playerIds: [entry._id] });
    const closed = await waitEvent(ownerConn, "pollCompleted", 45000);
    check("the vote closed with the owner's vote for player 1", !!closed && closed.payload.totalVotes === 1);

    await sleep(1500);
    doc = await Auction.findById(A);
    check("round 2 started with player 1 back up", doc.currentRound === 2 && String(doc.currentPlayer) === String(p1._id) && doc.status === "active", `round ${doc.currentRound}, ${doc.status}`);
    check("his live bid starts empty even though an old bid exists", !doc.currentBid?.amount);

    // nobody bids in round 2
    for (let i = 0; i < 40 && doc.status !== "completed"; i++) { await sleep(1000); doc = await Auction.findById(A); }
    check("the auction completed", doc.status === "completed", doc.status);
    check("player 1 stayed UNSOLD: the bid from round 1 did not sell him", doc.players[0].status === "unsold" && doc.results.length === 0, `${doc.results.length} sales, status ${doc.players[0].status}`);
    const team = await Team.findById(o1.teamId);
    check("no one was charged", doc.teams[0].purseRemaining === settings.maxPursePerTeam && team.players.length === 0);
    const history = await AuctionHistory.findById(A);
    check("the archive records no sales", !!history && history.summary.totalPlayersSold === 0);
} catch (error) {
    console.error("TEST ERROR:", error);
    check("suite ran without crashing", false);
}
await finish(clearDb);
