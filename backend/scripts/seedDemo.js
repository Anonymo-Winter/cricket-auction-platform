// Loads demo data so every role can be tried straight away: an admin, an auctioneer, four team owners
// (each with a team), 20 players and two auctions.
//
//   npm run seed:demo                      add the demo data (re-running refreshes it)
//   npm run seed:demo -- --start-in=10     first auction opens in 10 minutes (default 3)
//   npm run seed:demo -- --bid-time=60     seconds per player (default 45)
//   npm run seed:demo -- --reset           remove ONLY the demo data
//
// Everything created here has a fixed id derived from a "demo" key, so --reset (and a re-run) can find and
// replace exactly those documents and never touches anything you created yourself.
import crypto from "crypto";
import fs from "fs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/user.models.js";
import Team from "../models/team.models.js";
import Player from "../models/player.models.js";
import Auction from "../models/auction.models.js";
import AuctionHistory from "../models/auctionHistory.models.js";

dotenv.config();

if (process.env.NODE_ENV === "production") {
    console.error("Refusing to load demo data with NODE_ENV=production.");
    process.exit(1);
}

const arg = (name, fallback) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.split("=").slice(1).join("=") : fallback;
};
const RESET_ONLY = process.argv.includes("--reset");
const START_IN_MINUTES = Number(arg("start-in", 3));
const BID_TIME = Number(arg("bid-time", 45));
const PASSWORD = arg("password", "Demo@12345");

const idFor = (key) => new mongoose.Types.ObjectId(crypto.createHash("md5").update(`ipl-demo:${key}`).digest("hex").slice(0, 24));

const OWNERS = [
    { n: 1, name: "Demo Owner 1", team: "Demo Mumbai", short: "DMU", theme: "blue", color: "#1d4ed8" },
    { n: 2, name: "Demo Owner 2", team: "Demo Chennai", short: "DCH", theme: "yellow", color: "#ca8a04" },
    { n: 3, name: "Demo Owner 3", team: "Demo Bengaluru", short: "DBE", theme: "red", color: "#dc2626" },
    { n: 4, name: "Demo Owner 4", team: "Demo Kolkata", short: "DKO", theme: "purple", color: "#7e22ce" },
];
const PLAYER_COUNT = 20;

const ids = {
    admin: idFor("admin"),
    auctioneer: idFor("auctioneer"),
    owners: OWNERS.map((o) => idFor(`owner-${o.n}`)),
    teams: OWNERS.map((o) => idFor(`team-${o.n}`)),
    players: Array.from({ length: PLAYER_COUNT }, (_, i) => idFor(`player-${i}`)),
    auctions: [idFor("auction-1"), idFor("auction-2")],
};

// Read and check the sample players first, so a problem here can never leave half the demo data behind
const sample = JSON.parse(fs.readFileSync(new URL("../config/playersData.json", import.meta.url), "utf8"));
if (sample.length < PLAYER_COUNT) {
    console.error(`config/playersData.json has ${sample.length} players but the demo needs ${PLAYER_COUNT}.`);
    process.exit(1);
}

// Demo players: fixed ids, and always "available" (the sample file has a typo'd status on at least one player)
const demoPlayers = sample.slice(0, PLAYER_COUNT).map((p, i) => ({ ...p, _id: ids.players[i], status: "available" }));
const invalid = demoPlayers
    .map((p) => ({ name: p.name, error: new Player(p).validateSync() }))
    .filter((r) => r.error);
if (invalid.length) {
    console.error("Sample players failed validation, nothing was written:");
    invalid.forEach((r) => console.error(` - ${r.name}: ${Object.values(r.error.errors).map((e) => e.message).join("; ")}`));
    process.exit(1);
}

const logoFor = ({ short, color }) =>
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><circle cx="48" cy="48" r="46" fill="${color}"/>` +
            `<text x="48" y="58" font-family="Arial" font-size="28" font-weight="700" fill="white" text-anchor="middle">${short}</text></svg>`
    );

await mongoose.connect(process.env.MONGO_URL);

try {
    // ------------------------------------------------------------ remove any earlier demo data
    const removed = {
        auctionHistories: (await AuctionHistory.deleteMany({ _id: { $in: ids.auctions } })).deletedCount,
        auctions: (await Auction.deleteMany({ _id: { $in: ids.auctions } })).deletedCount,
        players: (await Player.deleteMany({ _id: { $in: ids.players } })).deletedCount,
        teams: (await Team.deleteMany({ _id: { $in: ids.teams } })).deletedCount,
        users: (await User.deleteMany({ _id: { $in: [ids.admin, ids.auctioneer, ...ids.owners] } })).deletedCount,
    };
    if (RESET_ONLY) {
        console.log("Removed demo data:", removed);
        process.exit(0);
    }

    // ------------------------------------------------------------ people
    const emailTaken = await User.find({
        _id: { $nin: [ids.admin, ids.auctioneer, ...ids.owners] },
        email: { $in: ["admin@demo.ipl", "auctioneer@demo.ipl", ...OWNERS.map((o) => `owner${o.n}@demo.ipl`)] },
    }).select("email");
    if (emailTaken.length) {
        throw new Error(`These emails already belong to real accounts: ${emailTaken.map((u) => u.email).join(", ")}`);
    }

    await User.create({ _id: ids.admin, name: "Demo Admin", email: "admin@demo.ipl", password: PASSWORD, role: "admin" });
    await User.create({ _id: ids.auctioneer, name: "Demo Auctioneer", email: "auctioneer@demo.ipl", password: PASSWORD, role: "auctioneer" });

    for (const [i, o] of OWNERS.entries()) {
        await User.create({ _id: ids.owners[i], name: o.name, email: `owner${o.n}@demo.ipl`, password: PASSWORD, role: "user" });
        const team = await Team.create({
            _id: ids.teams[i],
            name: o.team,
            shortName: o.short,
            logo: logoFor(o),
            owner: ids.owners[i],
            theme: o.theme,
        });
        await User.updateOne({ _id: ids.owners[i] }, { team: team._id });
    }

    // ------------------------------------------------------------ players (from the repo's sample data)
    await Player.insertMany(demoPlayers);

    // first 4 are the marquee set, then capped, uncapped, accelerated: the order players come up in
    const setFor = (i) => (i < 4 ? "marquee" : i < 10 ? "capped" : i < 15 ? "uncapped" : "accelerated");
    const auctionPlayers = (idList) => idList.map((player, order) => ({ player, status: "pending", order, set: setFor(order) }));

    // ------------------------------------------------------------ auctions
    const now = Date.now();
    const settings = {
        minBidIncrement: 100000,
        bidTimeLimit: BID_TIME,
        maxPursePerTeam: 500000000,
        maxOverseasPlayers: 4,
        maxSquadSize: 8,
        minSquadSize: 3,
    };

    // 1: registered teams, opens in a few minutes. Auctions open on their own at the start time.
    const start1 = new Date(now + START_IN_MINUTES * 60 * 1000);
    const end1 = new Date(start1.getTime() + 3 * 60 * 60 * 1000);
    const auction1 = await Auction.create({
        _id: ids.auctions[0],
        name: "Demo Auction (registered teams)",
        season: new Date().getFullYear(),
        startTime: start1,
        endTime: end1,
        status: "scheduled",
        auctioneer: ids.auctioneer,
        players: auctionPlayers(ids.players),
        teams: ids.teams.map((team) => ({ team, purseRemaining: settings.maxPursePerTeam, playersAcquired: 0, isActive: true })),
        settings,
    });
    for (const team of ids.teams) {
        await Team.updateOne(
            { _id: team },
            { $push: { registeredAuction: { auctionId: auction1._id, purseRemaining: settings.maxPursePerTeam, startTime: start1, endTime: end1 } } }
        );
    }

    // 2: tomorrow, no teams yet: for trying registration (sign up a new owner) and "add teams"
    const start2 = new Date(now + 24 * 60 * 60 * 1000);
    const end2 = new Date(start2.getTime() + 3 * 60 * 60 * 1000);
    const auction2 = await Auction.create({
        _id: ids.auctions[1],
        name: "Demo Auction 2 (open for registration)",
        season: new Date().getFullYear(),
        startTime: start2,
        endTime: end2,
        status: "scheduled",
        auctioneer: ids.auctioneer,
        players: auctionPlayers(ids.players.slice(0, 8)),
        teams: [],
        settings,
    });

    await User.updateOne(
        { _id: ids.auctioneer },
        {
            $set: {
                assignedAuctions: [auction1, auction2].map((a) => ({ auctionId: a._id, startTime: a.startTime, endTime: a.endTime })),
            },
        }
    );

    // ------------------------------------------------------------ summary
    console.log(replaceNote(removed));
    console.log("\nDemo data loaded. Password for every account below:", PASSWORD, "\n");
    console.table([
        { role: "admin", email: "admin@demo.ipl", lands_on: "/dashboard" },
        { role: "auctioneer", email: "auctioneer@demo.ipl", lands_on: "/assignedAuctions" },
        ...OWNERS.map((o) => ({ role: `team owner (${o.team})`, email: `owner${o.n}@demo.ipl`, lands_on: "/auctions" })),
    ]);
    console.log(`"${auction1.name}" opens at ${start1.toLocaleTimeString()} (in ${START_IN_MINUTES} min) with ${BID_TIME}s per player.`);
    console.log(`"${auction2.name}" is scheduled for tomorrow, with no teams.`);
    console.log("\nOnce an auction opens, players come up automatically and expire after the clock if nobody bids.");
    console.log("Open the auction as an owner in a few browsers and bid. Remove it all with: npm run seed:demo -- --reset");
} finally {
    await mongoose.disconnect();
}

function replaceNote(removed) {
    const had = Object.values(removed).some((n) => n > 0);
    return had ? "Replaced an earlier copy of the demo data." : "No earlier demo data found.";
}
