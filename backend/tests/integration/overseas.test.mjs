// The overseas-player limit (counting the whole squad, including players kept from an earlier auction),
// and the player's current price following the bids.
import fs from "fs";
import { check, call, cookieOf, connectDb, clearDb, finish, signupOwner, connectSocket, waitEvent, sleep } from "./harness.mjs";
import User from "../../models/user.models.js";
import Player from "../../models/player.models.js";
import Auction from "../../models/auction.models.js";
import Team from "../../models/team.models.js";

await connectDb();
await clearDb();

try {
    await User.create({ name: "ZZ Admin", email: "zz-admin@example.com", password: "adminpass123", role: "admin" });
    const admin = cookieOf(await call("POST", "/auth/login", null, { email: "zz-admin@example.com", password: "adminpass123" }));
    const [o1, o2, o3] = [await signupOwner(1), await signupOwner(2), await signupOwner(3)];

    const tpl = JSON.parse(fs.readFileSync(new URL("../../config/playersData.json", import.meta.url), "utf8"))[0];
    const mk = (name, nationality) => ({ ...tpl, name, nationality, basePrice: 1000000, status: "available", _id: undefined });
    const [ov1, ov2, in1, ovKept, ov3] = await Player.insertMany([
        mk("ZZ Overseas One", "Australian"), mk("ZZ Overseas Two", "English"), mk("ZZ Home One", "Indian"),
        mk("ZZ Kept Overseas", "South African"), mk("ZZ Overseas Three", "New Zealander"),
    ]);

    const settings = { minBidIncrement: 100000, bidTimeLimit: 60, maxPursePerTeam: 100000000, minSquadSize: 1, maxSquadSize: 25, maxOverseasPlayers: 1 };
    const mkAuction = (name, list, teams) =>
        Auction.create({
            name, season: 2099, startTime: new Date(Date.now() + 3600e3), endTime: new Date(Date.now() + 7200e3), status: "scheduled",
            players: list.map((p, i) => ({ player: p._id, status: "pending", order: i, set: "marquee" })),
            teams: teams.map((t) => ({ team: t.teamId, purseRemaining: settings.maxPursePerTeam, playersAcquired: 0, isActive: true })),
            settings,
        });
    const a1 = await mkAuction("ZZ Overseas Auction", [ov1, ov2, in1], [o1, o2]);
    const A = String(a1._id);
    for (const o of [o1, o2]) await Team.updateOne({ _id: o.teamId }, { $push: { registeredAuction: { auctionId: a1._id, purseRemaining: settings.maxPursePerTeam } } });

    await Auction.updateOne({ _id: A }, { status: "active", currentPlayer: null });
    const adminConn = await connectSocket(admin);
    const watcher = await connectSocket(null);
    watcher.socket.emit("joinAuction", A);
    await waitEvent(watcher, "playerUpdate", 4000);

    const bid = (o, amount, pid, aid = A) => call("POST", "/bids", o.cookie, { auctionId: aid, playerId: String(pid), teamId: o.teamId, amount });
    const current = async () => String((await Auction.findById(A)).currentPlayer);
    const sell = async () => { adminConn.socket.emit("playerSold", { auctionId: A }); await sleep(1200); };

    // ---- first overseas player: o1 bids, o2 outbids, the price follows, o2 gets him
    check("overseas player one is up", (await current()) === String(ov1._id));
    check("owner 1 bids", (await bid(o1, 1000000, ov1._id)).status === 201);
    check("owner 2 outbids", (await bid(o2, 1100000, ov1._id)).status === 201);
    check("the player's current price follows the bids", (await Player.findById(ov1._id)).currentPrice === 1100000, String((await Player.findById(ov1._id)).currentPrice));
    await sell();
    check("sold to owner 2", String((await Auction.findById(A)).results[0]?.soldTo) === o2.teamId);

    // ---- owner 2 now has 1 overseas player = the limit
    check("overseas player two is up", (await current()) === String(ov2._id));
    const refused = await bid(o2, 1000000, ov2._id);
    check("a team at the overseas limit cannot bid on another overseas player", refused.status === 400 && /overseas/i.test(refused.json.message), refused.json.message);
    check("...but a team with no overseas players can", (await bid(o1, 1000000, ov2._id)).status === 201);
    await sell();

    // ---- an Indian player is never limited
    check("the Indian player is up", (await current()) === String(in1._id));
    check("a team at the overseas limit can still bid on an Indian player", (await bid(o2, 1000000, in1._id)).status === 201);

    // ---- a squad carried over from an earlier auction counts
    await Team.updateOne({ _id: o3.teamId }, { $push: { players: { player: ovKept._id, auction: a1._id, purchasePrice: 1000000, nationality: "South African" } } });
    const a2 = await mkAuction("ZZ Second Auction", [ov3], [o3]);
    await Team.updateOne({ _id: o3.teamId }, { $push: { registeredAuction: { auctionId: a2._id, purseRemaining: settings.maxPursePerTeam } } });
    await Auction.updateOne({ _id: a2._id }, { status: "active", currentPlayer: ov3._id, "players.0.status": "current", timeRemaining: new Date(Date.now() + 60000) });
    const kept = await bid(o3, 1000000, ov3._id, String(a2._id));
    check("an overseas player kept from an earlier auction counts towards the limit", kept.status === 400 && /overseas/i.test(kept.json.message), kept.json.message);

    // ---- a limit of 0 means no overseas players at all
    await Auction.updateOne({ _id: a2._id }, { "settings.maxOverseasPlayers": 0 });
    await Team.updateOne({ _id: o3.teamId }, { $set: { players: [] } });
    check("a limit of 0 refuses any overseas player", (await bid(o3, 1000000, ov3._id, String(a2._id))).status === 400);
    await Auction.updateOne({ _id: a2._id }, { "settings.maxOverseasPlayers": 2 });
    check("and the same player is fine once the limit allows it", (await bid(o3, 1000000, ov3._id, String(a2._id))).status === 201);
} catch (error) {
    console.error("TEST ERROR:", error);
    check("suite ran without crashing", false);
}
await finish(clearDb);
