// After a sale the next player does NOT come up (and no clock runs) until the result has been on screen.
// This server runs with RESULT_BREAK_SECONDS=3. Plays in real time: ~25 seconds (a bid in the last 10 seconds extends the clock).
import fs from "fs";
import { check, call, connectDb, clearDb, finish, signupOwner, sleep } from "./harness.mjs";
import Player from "../../models/player.models.js";
import Auction from "../../models/auction.models.js";
import Team from "../../models/team.models.js";

await connectDb();
await clearDb();

try {
    const o1 = await signupOwner(1);
    const tpl = JSON.parse(fs.readFileSync(new URL("../../config/playersData.json", import.meta.url), "utf8"))[0];
    const [p1, p2] = await Player.insertMany([1, 2].map((i) => ({ ...tpl, name: `ZZ Player ${i}`, basePrice: 1000000, status: "available", _id: undefined })));
    const settings = { minBidIncrement: 100000, bidTimeLimit: 5, maxPursePerTeam: 40000000, minSquadSize: 1, maxSquadSize: 25 };
    const a = await Auction.create({
        name: "ZZ Break Auction", season: 2099, startTime: new Date(Date.now() + 3600e3), endTime: new Date(Date.now() + 7200e3), status: "scheduled",
        players: [p1, p2].map((p, i) => ({ player: p._id, status: "pending", order: i, set: "marquee" })),
        teams: [{ team: o1.teamId, purseRemaining: settings.maxPursePerTeam, playersAcquired: 0, isActive: true }],
        settings,
    });
    const A = String(a._id);
    await Team.updateOne({ _id: o1.teamId }, { $push: { registeredAuction: { auctionId: a._id, purseRemaining: settings.maxPursePerTeam } } });
    await Auction.updateOne({ _id: A }, { status: "active", currentPlayer: null });

    // the cron loads the first player (at most a minute); wait for it
    let doc;
    for (let i = 0; i < 70; i++) { doc = await Auction.findById(A); if (doc.currentPlayer) break; await sleep(1000); }
    check("player 1 is up", String(doc.currentPlayer) === String(p1._id));

    const bid = await call("POST", "/bids", o1.cookie, { auctionId: A, playerId: String(p1._id), teamId: o1.teamId, amount: 1000000 });
    check("the owner bids on player 1", bid.status === 201);

    // wait for the clock to run out and the sale to happen
    for (let i = 0; i < 50; i++) { doc = await Auction.findById(A); if (doc.results.length === 1) break; await sleep(500); }
    const saleAt = Date.now();
    check("player 1 was sold", doc.results.length === 1);
    check("nobody is up for auction while the result is on screen", !doc.currentPlayer && doc.status === "active", `currentPlayer ${doc.currentPlayer}, ${doc.status}`);
    check("player 2 is still waiting", doc.players[1].status === "pending");

    const early = await call("POST", "/bids", o1.cookie, { auctionId: A, playerId: String(p2._id), teamId: o1.teamId, amount: 1000000 });
    check("a bid on the next player is refused during the break", early.status === 400, `status ${early.status}`);

    for (let i = 0; i < 20; i++) { doc = await Auction.findById(A); if (doc.currentPlayer) break; await sleep(250); }
    const waited = Date.now() - saleAt;
    check("player 2 comes up after the break", String(doc.currentPlayer) === String(p2._id), `${waited} ms after the sale`);
    check("the break lasted about 3 seconds", waited >= 2000 && waited <= 6000, `${waited} ms`);
    const left = new Date(doc.timeRemaining).getTime() - Date.now();
    check("the next player's clock starts full when he comes up", left > (settings.bidTimeLimit - 1.5) * 1000 && left <= settings.bidTimeLimit * 1000, `${left} ms left`);
} catch (error) {
    console.error("TEST ERROR:", error);
    check("suite ran without crashing", false);
}
await finish(clearDb);
