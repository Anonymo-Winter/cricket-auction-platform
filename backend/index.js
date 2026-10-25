import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import authRouter from "./routes/auth.routes.js";
import auctionRoutes from "./routes/auction.routes.js";
import teamRoutes from "./routes/team.routes.js";
import commonRoutes from "./routes/common.routes.js";
import playerRoutes from "./routes/player.routes.js";
import userRoutes from "./routes/user.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import { verifyToken, requireRole, requireOwnTeam } from "./middlewares/verifyToken.middleware.js";
import { socketAuth, canControlAuction } from "./utils/socketAuth.js";
import { jwtKeyProblem } from "./utils/security.js";
import { apiLimiter, bidLimiter } from "./middlewares/rateLimit.js";
import mongoose from "mongoose";
import User from "./models/user.models.js";
import { completeAuction } from "./services/auctionCompletion.js";

import connectDB from "./DB/connectDB.js";
import Player from "./models/player.models.js";
import Auction from "./models/auction.models.js";
import Team from "./models/team.models.js";

dotenv.config();

// A guessable JWT_KEY lets anyone sign a login for any account, so a weak one stops a production server starting
const jwtProblem = jwtKeyProblem(process.env.JWT_KEY);
if (jwtProblem) {
    if (process.env.NODE_ENV === "production") {
        console.error(`Refusing to start: ${jwtProblem}`);
        process.exit(1);
    }
    console.warn(
        `WARNING: ${jwtProblem} Anyone who can guess it can sign in as any user. Generate one with:\n` +
            `  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
    );
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true,
    },
});

// Know who is on each socket (visitors may still spectate)
io.use(socketAuth);

// Behind a reverse proxy, set TRUST_PROXY (e.g. 1) so rate limits see the real client address
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true,
    })
);

// Is the server (and its database) up?
app.get("/api/health", (req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({ ok: dbUp, database: dbUp ? "connected" : "disconnected", uptimeSeconds: Math.round(process.uptime()) });
});

app.use("/api", apiLimiter);

app.use("/api/auth", authRouter);
app.use("/api/auction", auctionRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/player", playerRoutes);
app.use("/api/user", userRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api", commonRoutes);

const activeAuctions = new Map();
const debounceTimers = new Map();

// A bid in the last ANTI_SNIPE_MS gives everyone a fresh ANTI_SNIPE_MS
const ANTI_SNIPE_MS = 10 * 1000;

// Every "timerSync" carries the same fields, however it was triggered: the absolute end time, the whole seconds
// left, and the server's clock so clients can correct for a wrong local clock
const timerPayload = (auctionId, endTime) => {
    const end = new Date(endTime);
    return {
        auctionId,
        endTime: end,
        timeRemaining: Math.max(0, Math.floor((end.getTime() - Date.now()) / 1000)),
        serverTime: Date.now(),
    };
};

app.post("/api/bids", verifyToken, bidLimiter, requireRole("user"), requireOwnTeam, async (req, res) => {
    const { auctionId, playerId, teamId } = req.body;
    const amount = Number(req.body.amount);

    try {
        if (!auctionId || !playerId || !teamId || !Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Required fields missing or invalid: auctionId, playerId, teamId, amount",
            });
        }
        if (![auctionId, playerId, teamId].every((v) => mongoose.Types.ObjectId.isValid(v))) {
            return res.status(400).json({ success: false, message: "Invalid auction, player or team id" });
        }

        // Validates the bid and applies it in one atomic update (see Auction.placeBidAtomic)
        const auction = await Auction.placeBidAtomic({ auctionId, playerId, teamId, amount });
        if (!auction) {
            return res.status(409).json({
                success: false,
                message: "Your bid was beaten by someone else or the clock ran out. Check the latest bid and try again.",
            });
        }

        // Anti-sniping: extend the clock, and re-arm the running timer so it really honours the new end time
        const now = Date.now();
        if (auction.timeRemaining.getTime() - now < ANTI_SNIPE_MS) {
            const extended = new Date(now + ANTI_SNIPE_MS);
            await Auction.updateOne({ _id: auctionId, timeRemaining: { $lt: extended } }, { timeRemaining: extended });
            io.to(auctionId.toString()).emit("timerSync", timerPayload(auction._id, extended));
            startOrRefreshAuctionTimer(auctionId.toString());
        }

        const player = await Player.findByIdAndUpdate(playerId, { currentPrice: amount }, { new: true }).select("name");
        const team = await Team.findById(teamId).select("name shortName logo");

        io.to(auctionId.toString()).emit("bidUpdate", {
            auctionId: auction._id,
            updatedBid: {
                amount,
                teamId,
                timestamp: Date.now(),
            },
            placedBid: {
                amount,
                player: { id: playerId, name: player?.name },
                team,
                timestamp: Date.now(),
            },
        });

        return res.status(201).json({
            success: true,
            message: "Bid placed successfully",
            bid: auction.currentBid,
            teamPurseRemaining: auction.teams.find((t) => t.team.toString() === teamId)?.purseRemaining,
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ success: false, message: error.message });
        }
        console.error("Error placing bid:", error);
        return res.status(500).json({ success: false, message: "Could not place the bid" });
    }
});

// Each (re)arming of an auction's clock gets a new generation; an older clock notices and stops itself
const timerGeneration = new Map();

const startOrRefreshAuctionTimer = async (auctionId, retries = 3) => {
    try {
        const generation = (timerGeneration.get(auctionId) || 0) + 1;
        timerGeneration.set(auctionId, generation);
        const isCurrent = () => timerGeneration.get(auctionId) === generation;

        if (activeAuctions.has(auctionId)) {
            const { timeout, interval } = activeAuctions.get(auctionId);
            if (timeout) clearTimeout(timeout);
            if (interval) clearInterval(interval);
        }

        const auction = await Auction.findById(auctionId)
            .select("status timeRemaining settings.bidTimeLimit currentPlayer")
            .lean();

        if (!isCurrent()) return; // a newer call took over while we were reading

        if (!auction || auction.status !== "active" || !auction.timeRemaining) {
            console.warn(`Auction ${auctionId} not found, inactive or missing time`);
            return;
        }

        if (auction.timeRemaining.getTime() <= Date.now()) {
            await handleTimerExpired(auctionId);
            return;
        }

        const endTime = new Date(auction.timeRemaining.getTime());
        let lastTimeRemaining = null;

        const updateTimer = async () => {
            if (!isCurrent()) return;
            try {
                const now = Date.now();
                const timeRemaining = Math.max(Math.floor((endTime - now) / 1000), 0);

                if (timeRemaining !== lastTimeRemaining) {
                    lastTimeRemaining = timeRemaining;

                    debounceTimerUpdate(
                        auctionId,
                        () => {
                            io.to(auctionId).emit("timerSync", {
                                auctionId,
                                endTime,
                                timeRemaining,
                                serverTime: now,
                            });
                        },
                        300
                    );
                }

                // Expire only once the end time has really passed: calling this up to a second early used to send
                // it round a "not yet, re-arm" loop that could drop the real expiry
                if (endTime.getTime() <= now) {
                    await handleTimerExpired(auctionId);
                    return;
                }

                const nextTick = 1000 - (now % 1000);
                const timeout = setTimeout(updateTimer, nextTick);

                activeAuctions.set(auctionId, {
                    timeout,
                    interval: null,
                    endTime,
                    lastActive: now,
                });
            } catch (err) {
                console.error(`Error in auction timer for ${auctionId}:`, err);
                if (retries > 0) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    return startOrRefreshAuctionTimer(auctionId, retries - 1);
                }
                io.to(auctionId).emit("timerError", {
                    message: "Timer encountered an error",
                    auctionId,
                });
            }
        };

        if (!isCurrent()) return;

        const initialDelay = 1000 - (Date.now() % 1000);
        const timeout = setTimeout(updateTimer, initialDelay);

        activeAuctions.set(auctionId, {
            timeout,
            interval: null,
            endTime,
            lastActive: Date.now(),
        });
    } catch (err) {
        console.error(`Failed to initialize timer for ${auctionId}:`, err);
        if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return startOrRefreshAuctionTimer(auctionId, retries - 1);
        }
        io.to(auctionId).emit("timerError", {
            message: "Failed to initialize timer",
            auctionId,
        });
    }
};

const debounceTimerUpdate = (auctionId, updateFn, delay = 500) => {
    if (debounceTimers.has(auctionId)) {
        clearTimeout(debounceTimers.get(auctionId));
    }
    debounceTimers.set(
        auctionId,
        setTimeout(() => {
            updateFn();
            debounceTimers.delete(auctionId);
        }, delay)
    );
};

const syncTimer = async (auctionId) => {
    try {
        const auction = await Auction.findById(auctionId).select("status timeRemaining").lean();

        // A scheduled, paused, waiting or finished auction has no running clock to sync
        if (!auction || auction.status !== "active") return;

        const now = Date.now();
        const serverTimeRemaining = Math.max(0, auction.timeRemaining.getTime() - now);

        io.to(auctionId).emit("timerSync", {
            auctionId,
            endTime: auction.timeRemaining,
            timeRemaining: Math.floor(serverTimeRemaining / 1000),
            serverTime: now,
        });
    } catch (err) {
        console.error(`Error syncing timer for ${auctionId}:`, err);
    }
};

const populatedAuction = (auctionId) =>
    Auction.findById(auctionId)
        .populate("players.player")
        .populate("results.player", "name nationality image basePrice role")
        .populate("results.soldTo", "logo name shortName")
        .populate("bids.player")
        .populate("bids.team")
        .exec();

// Pushes the latest auction state to everyone watching it
const broadcastAuction = async (auctionId) => {
    try {
        const auction = await populatedAuction(auctionId);
        if (!auction) return;

        const currentPlayer = auction.players?.find((p) => p.player?.equals(auction.currentPlayer));
        const recentBids = auction.bids
            .filter((b) => b.player?.equals(auction.currentPlayer))
            .slice(-10)
            .sort((a, b) => b.timestamp - a.timestamp);

        io.to(auctionId).emit("playerUpdate", { auctionId, currentPlayer });
        io.to(auctionId).emit("auctionUpdate", { auction });
        io.to(auctionId).emit("recentBidsUpdate", { auctionId, recentBids });
    } catch (error) {
        console.error(`Error broadcasting auction ${auctionId}:`, error);
    }
};

// Stops the running clock for an auction (pause / complete) without touching any poll state
const disarmAuctionTimer = (auctionId) => {
    timerGeneration.set(auctionId, (timerGeneration.get(auctionId) || 0) + 1); // stops any clock still running
    const entry = activeAuctions.get(auctionId);
    if (entry?.timeout) clearTimeout(entry.timeout);
    if (entry?.interval) clearInterval(entry.interval);
    if (entry) {
        entry.timeout = null;
        entry.interval = null;
    }
    if (debounceTimers.has(auctionId)) {
        clearTimeout(debounceTimers.get(auctionId));
        debounceTimers.delete(auctionId);
    }
};

const advancing = new Set();
const ADVANCE_LEASE_MS = 15 * 1000;
// How long a SOLD / UNSOLD result stays up before the next player comes (the page shows it for the same time)
const RESULT_BREAK_MS = Math.max(0, Number(process.env.RESULT_BREAK_SECONDS ?? 5)) * 1000;

// Sells (or passes on) the current player and brings up the next one. Runs when the clock runs out and
// for the auctioneer's "next player" / "sold" buttons (force = true skips the "has the clock run out?" check).
// Only ever advances an ACTIVE auction, so a paused auction can never sell a player.
const runAdvance = async (auctionId, { force = false } = {}) => {
    if (advancing.has(auctionId)) return; // the clock and the cron job can fire together
    advancing.add(auctionId);
    let leased = false;
    try {
        // Same protection across server processes (or a restart overlap): take a short lease in the database
        const now = new Date();
        const lease = await Auction.findOneAndUpdate(
            { _id: auctionId, $or: [{ advanceLockUntil: null }, { advanceLockUntil: { $lt: now } }] },
            { $set: { advanceLockUntil: new Date(now.getTime() + ADVANCE_LEASE_MS) } },
            { projection: "_id" }
        );
        if (!lease) return; // another process is already moving this auction along
        leased = true;

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const auction = await Auction.findById(auctionId);
                if (!auction || auction.status !== "active") return;

                // The end time was pushed out (a late bid) after this clock was armed: don't sell yet
                if (!force && auction.currentPlayer && auction.timeRemaining.getTime() > Date.now()) {
                    return "not-yet";
                }

                // Show the result first: sell, tell everyone, and bring the next player up a few seconds later, so
                // the next clock never runs behind the "SOLD" banner
                const hasPending = auction.players.some((p) => p.status === "pending");
                if (RESULT_BREAK_MS > 0 && hasPending && auction.players.some((p) => p.status === "current")) {
                    await auction.resolveCurrentPlayer();
                    await auction.holdForNextPlayer(RESULT_BREAK_MS);
                    disarmAuctionTimer(auctionId);
                    await broadcastAuction(auctionId);
                    setTimeout(() => advanceAuction(auctionId, { force: true }), RESULT_BREAK_MS + 200);
                    return;
                }

                await auction.moveToNextPlayer();
                await broadcastAuction(auctionId);

                if (auction.status === "active") {
                    startOrRefreshAuctionTimer(auctionId);
                } else if (auction.status === "waiting") {
                    handleExhausted(auctionId);
                }
                return;
            } catch (error) {
                console.error(`Error advancing auction ${auctionId} (attempt ${attempt + 1}):`, error);
                if (attempt === 2) {
                    io.to(auctionId).emit("auctionError", {
                        message: "Error processing player transition",
                        details: error.message,
                    });
                    return;
                }
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
    } finally {
        if (leased) await Auction.updateOne({ _id: auctionId }, { $set: { advanceLockUntil: null } }).catch(() => {});
        advancing.delete(auctionId);
    }
};

// Moves the auction on; if it turned out not to be time yet, re-arms the clock. That has to happen only AFTER the
// locks above are released: re-arming reads the database and may immediately call this again, and a call made while
// the previous one is still releasing its lock is silently dropped, leaving nothing to sell the player.
const advanceAuction = async (auctionId, options = {}) => {
    const outcome = await runAdvance(auctionId, options);
    if (outcome === "not-yet") startOrRefreshAuctionTimer(auctionId);
};

const handleTimerExpired = (auctionId) => advanceAuction(auctionId);

// ------------------------------------------------------------------------------------------------
// Running out of players. Nobody has to press anything:
//  1. unsold players go to an owners' vote (a poll) for POLL_SECONDS;
//  2. players who got a vote come back for one more round; if nobody voted, or the extra round has already
//     been played, the auction completes and its results are archived.
// An admin (or the assigned auctioneer) can still step in at any point.
// ------------------------------------------------------------------------------------------------
const POLL_SECONDS = 30;
const MAX_AUCTION_ROUNDS = 2; // the main round plus one round for players put back by the vote

const activePollOf = (auctionId) => activeAuctions.get(auctionId)?.poll;

const finishAuction = async (auctionId) => {
    try {
        const result = await completeAuction(auctionId);
        // 400 = it was already completed (e.g. an admin got there first)
        if (result.error && result.status !== 400) {
            console.error(`Could not complete auction ${auctionId}: ${result.error}`);
            return;
        }
        disarmAuctionTimer(auctionId);
        await broadcastAuction(auctionId);
    } catch (error) {
        console.error(`Error completing auction ${auctionId}:`, error);
    }
};

const startPollCountdown = (auctionId, duration, startTime, status) => {
    const endTime = startTime + duration * 1000;

    const countdownInterval = setInterval(() => {
        const now = Date.now();
        let timeRemaining = Math.max(Math.floor((endTime - now) / 1000), 0);

        io.to(auctionId).emit("pollTimerUpdate", {
            auctionId,
            timeRemaining,
            startTime,
            status,
        });

        if (timeRemaining === 0) {
            clearInterval(countdownInterval); // Stop only after sending 0
        }
    }, 1000);

    if (activeAuctions.has(auctionId)) {
        activeAuctions.get(auctionId).poll.countdown = countdownInterval;
    }
};

// Puts the unsold players to the owners' vote. Returns { error } if a poll can't be started.
const startPoll = async (auctionId) => {
    if (activePollOf(auctionId)?.active) return { error: "A poll is already active for this auction" };

    const auction = await Auction.findById(auctionId).populate(
        "players.player",
        "name basePrice role nationality isUncapped image"
    );
    if (!auction) return { error: "Auction not found" };

    const unsoldPlayers = auction.players.filter((player) => player.status === "unsold");
    if (unsoldPlayers.length === 0) return { error: "No unsold players available for poll" };

    const pollData = {
        active: true,
        timer: setTimeout(() => handlePollCompleted(auctionId), POLL_SECONDS * 1000),
        countdown: null,
        votes: {},
        voters: new Set(),
        startTime: Date.now(),
        duration: POLL_SECONDS,
    };

    if (!activeAuctions.has(auctionId)) {
        activeAuctions.set(auctionId, { interval: null, lastActive: Date.now(), poll: null });
    }
    activeAuctions.get(auctionId).poll = pollData;

    io.to(auctionId).emit("userPoll", {
        auctionId,
        unsoldPlayers,
        pollDuration: POLL_SECONDS,
        pollStartTime: Date.now(),
    });
    startPollCountdown(auctionId, POLL_SECONDS, Date.now());
    return {};
};

// Tallies the vote, then carries on by itself: voted players come back, otherwise the auction completes
const handlePollCompleted = async (auctionId) => {
    const entry = activeAuctions.get(auctionId);
    if (!entry || !entry.poll?.active) {
        console.warn(`No active poll found for auction ${auctionId}`);
        return;
    }
    // Close the poll first so a vote or a second timer can't act on it again
    const poll = entry.poll;
    poll.active = false;
    clearTimeout(poll.timer);
    clearInterval(poll.countdown);

    try {
        const votes = poll.votes || {};
        const voters = [...(poll.voters || [])];
        const auction = await Auction.findById(auctionId);
        if (!auction) return;

        let hasPending = false;
        auction.players.forEach((player) => {
            if (player.status === "unsold" && votes[player._id.toString()]) {
                player.status = "pending";
                hasPending = true;
            }
        });
        if (hasPending) auction.markModified("players");

        auction.activePoll = {
            active: false,
            completed: true,
            votes: new Map(Object.entries(votes)),
            voters,
            startTime: null,
            duration: null,
        };

        if (hasPending) {
            // Straight on to the extra round
            auction.currentRound = (auction.currentRound || 1) + 1;
            auction.currentPlayer = null;
            auction.currentBid = null;
            auction.status = "active";
            auction.logs.push({ action: "resume", details: { message: "Players put back by the owners' vote" }, timestamp: new Date() });
        }
        await auction.save();

        io.to(auctionId).emit("pollCompleted", {
            auctionId,
            allVotes: votes,
            totalVotes: Object.values(votes).reduce((sum, count) => sum + count, 0),
        });

        poll.votes = {};
        poll.voters?.clear();

        if (hasPending) {
            await advanceAuction(auctionId, { force: true });
        } else {
            await finishAuction(auctionId);
        }
    } catch (error) {
        console.error(`Error in handlePollCompleted for ${auctionId}:`, error);
        io.to(auctionId).emit("error", {
            message: "Failed to process poll results",
            details: error.message,
        });
    }
};

const exhausting = new Set();

// Called when an auction has no player left to bring up (status "waiting")
const handleExhausted = async (auctionId) => {
    if (exhausting.has(auctionId) || activePollOf(auctionId)?.active) return;
    exhausting.add(auctionId);
    try {
        const auction = await Auction.findById(auctionId).select("status players currentRound");
        if (!auction || auction.status !== "waiting") return;
        if (auction.players.some((p) => p.status === "pending" || p.status === "current")) return;

        const hasUnsold = auction.players.some((p) => p.status === "unsold");
        if (hasUnsold && (auction.currentRound || 1) < MAX_AUCTION_ROUNDS) {
            const started = await startPoll(auctionId);
            if (!started.error) return;
        }
        await finishAuction(auctionId);
    } catch (error) {
        console.error(`Error handling exhausted auction ${auctionId}:`, error);
    } finally {
        exhausting.delete(auctionId);
    }
};

const cleanupInactiveTimers = () => {
    const now = Date.now();
    const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

    for (const [auctionId, data] of activeAuctions.entries()) {
        if (now - data.lastActive > maxInactiveTime) {
            if (data.timeout) clearTimeout(data.timeout);
            if (data.interval) clearInterval(data.interval);
            if (data.poll) {
                clearTimeout(data.poll.timer);
                clearInterval(data.poll.countdown);
            }

            if (debounceTimers.has(auctionId)) {
                clearTimeout(debounceTimers.get(auctionId));
                debounceTimers.delete(auctionId);
            }

            io.sockets.in(auctionId).removeAllListeners();

            activeAuctions.delete(auctionId);
        }
    }
};

const validateTimerState = async (auctionId) => {
    const memoryData = activeAuctions.get(auctionId);
    if (!memoryData) return false;

    const dbData = await Auction.findById(auctionId).select("status timeRemaining").lean();

    if (!dbData || dbData.status !== "active") {
        if (memoryData.timeout) clearTimeout(memoryData.timeout);
        if (memoryData.interval) clearInterval(memoryData.interval);
        if (memoryData.poll?.active) {
            // An auction waiting on the owners' vote isn't "active" but its poll state must survive this check
            memoryData.timeout = null;
            memoryData.interval = null;
        } else {
            activeAuctions.delete(auctionId);
        }
        return false;
    }

    const serverTimeRemaining = dbData.timeRemaining.getTime() - Date.now();
    const memoryTimeRemaining = memoryData.endTime.getTime() - Date.now();

    if (Math.abs(serverTimeRemaining - memoryTimeRemaining) > 5000) {
        console.warn(`Timer drift detected for auction ${auctionId}, resyncing`);
        startOrRefreshAuctionTimer(auctionId);
        return false;
    }

    return true;
};

setInterval(() => {
    activeAuctions.forEach((_, auctionId) => validateTimerState(auctionId));
}, 60000);

// Regular cleanup
setInterval(cleanupInactiveTimers, 5 * 60 * 1000); // Every 5 minutes

// Regular synchronization
setInterval(() => {
    activeAuctions.forEach((_, auctionId) => syncTimer(auctionId));
}, 30000); // Every 30 seconds

app.set("auctionRuntime", {
    arm: startOrRefreshAuctionTimer,
    disarm: disarmAuctionTimer,
    broadcast: broadcastAuction,
});

// How many people are watching an auction (everyone in its room: owners, spectators, the big screen)
const emitViewerCount = (auctionId) =>
    io.to(auctionId).emit("viewerCount", { auctionId, count: io.sockets.adapter.rooms.get(auctionId)?.size || 0 });

io.on("connection", (socket) => {
    // Read-only snapshot for whoever asks; spectators included. Starting the first player is the server's job
    // (see the cron job), so a visitor connecting can never move an auction along.
    const sendInitialData = async (auctionId) => {
        try {
            const currentAuction = await populatedAuction(auctionId);

            if (!currentAuction) {
                socket.emit("initialData", { error: "Auction not found." });
                return;
            }

            const currentPlayer = currentAuction.players?.find((p) => p.player?.equals(currentAuction.currentPlayer));
            const unsoldPlayers = currentAuction.players?.filter((player) => player.status === "unsold") || [];
            const recentBids = currentAuction.bids
                .filter((b) => b.player?.equals(currentAuction.currentPlayer))
                .slice(-10)
                .sort((a, b) => b.timestamp - a.timestamp);

            if (currentAuction.status === "active") {
                socket.emit("timerSync", timerPayload(currentAuction._id, currentAuction.timeRemaining));
            }

            socket.emit("initialData", {
                auction: currentAuction,
                currentPlayer,
                recentBids,
                unsoldPlayers,
            });
        } catch (error) {
            console.error("Error sending initial data:", error);
            socket.emit("initialData", {
                error: "Failed to load auction data.",
                details: error.message,
            });
        }
    };

    // Auctioneer controls: only an admin or the auctioneer assigned to this auction may use them.
    // The account is re-checked each time, so a deactivated or demoted user loses control at once.
    const getControlledAuction = async (auctionId) => {
        const user = socket.data.user;
        if (!user) {
            socket.emit("auctionError", { message: "Please sign in to control an auction" });
            return null;
        }
        if (!mongoose.Types.ObjectId.isValid(auctionId)) {
            socket.emit("auctionError", { message: "Invalid auction ID" });
            return null;
        }
        const fresh = await User.findById(user.id).select("role status");
        const auction = await Auction.findById(auctionId);
        if (!auction) {
            socket.emit("auctionError", { message: "Auction not found" });
            return null;
        }
        if (!fresh || fresh.status !== "active" || !canControlAuction({ id: user.id, role: fresh.role }, auction)) {
            socket.emit("auctionError", { message: "You are not allowed to control this auction" });
            return null;
        }
        return auction;
    };

    // "Next player": sells the current player to the highest bidder (or passes if nobody bid) and moves on
    socket.on("requestNextPlayer", async ({ auctionId } = {}) => {
        try {
            const auction = await getControlledAuction(auctionId);
            if (!auction) return;
            if (auction.status !== "active") {
                return socket.emit("auctionError", { message: `Auction is ${auction.status}` });
            }
            await advanceAuction(auctionId, { force: true });
        } catch (error) {
            socket.emit("auctionError", { message: error.message });
        }
    });

    // Skip the current player without selling them
    socket.on("skipPlayer", async ({ auctionId } = {}) => {
        try {
            const auction = await getControlledAuction(auctionId);
            if (!auction) return;
            if (auction.status !== "active") {
                return socket.emit("auctionError", { message: `Auction is ${auction.status}` });
            }

            await auction.skipToNextPlayer();
            await broadcastAuction(auctionId);
            if (auction.status === "active") startOrRefreshAuctionTimer(auctionId);
            else if (auction.status === "waiting") handleExhausted(auctionId);
        } catch (error) {
            socket.emit("auctionError", { message: error.message });
        }
    });

    // Sell the current player now. The price and buyer are the server's current highest bid; anything
    // the client sends about team or amount is ignored.
    socket.on("playerSold", async ({ auctionId } = {}) => {
        try {
            const auction = await getControlledAuction(auctionId);
            if (!auction) return;
            if (auction.status !== "active") {
                return socket.emit("auctionError", { message: `Auction is ${auction.status}` });
            }
            if (!auction.currentBid?.amount) {
                return socket.emit("auctionError", { message: "There is no bid to sell this player to" });
            }
            await advanceAuction(auctionId, { force: true });
        } catch (error) {
            socket.emit("auctionError", { message: error.message });
        }
    });

    socket.on("fetchInitialData", ({ id }) => {
        if (!id) {
            return socket.emit("initialData", {
                error: "Auction ID is required.",
            });
        }
        sendInitialData(id);
    });

    // When pausing the auction: the current player's remaining time is frozen and the clock stops
    socket.on("pauseAuction", async ({ auctionId } = {}) => {
        try {
            const auction = await getControlledAuction(auctionId);
            if (!auction) return;

            await auction.pauseAuction();
            disarmAuctionTimer(auctionId);
            await broadcastAuction(auctionId);
        } catch (error) {
            socket.emit("auctionError", { message: error.message });
        }
    });

    // Resuming carries on with the time that was left
    socket.on("resumeAuction", async ({ auctionId } = {}) => {
        try {
            const auction = await getControlledAuction(auctionId);
            if (!auction) return;

            await auction.resumeAuction();
            if (auction.currentPlayer) {
                startOrRefreshAuctionTimer(auctionId);
                await broadcastAuction(auctionId);
            } else {
                await advanceAuction(auctionId, { force: true });
            }
        } catch (error) {
            socket.emit("auctionError", { message: error.message });
        }
    });

    socket.on("joinAuction", (auctionId) => {
        if (!auctionId) {
            return socket.emit("auctionError", {
                message: "Auction ID is required.",
            });
        }

        socket.join(auctionId);
        emitViewerCount(auctionId);

        if (activeAuctions.has(auctionId)) {
            activeAuctions.get(auctionId).lastActive = Date.now();
        }

        syncTimer(auctionId)
            .then(() => sendInitialData(auctionId))
            .catch((err) => console.error("Sync error:", err));

        // An open auction with nobody up for bidding yet: bring up the first player. This cannot sell anything
        // (there is no current player), so it is safe for anyone's connection to trigger.
        if (mongoose.Types.ObjectId.isValid(auctionId)) {
            Auction.exists({ _id: auctionId, status: "active", currentPlayer: null })
                .then((needsPlayer) => needsPlayer && advanceAuction(auctionId, { force: true }))
                .catch((err) => console.error("Could not load first player:", err));
        }
    });

    socket.on("requestSync", ({ auctionId }) => {
        if (!auctionId) {
            return socket.emit("auctionError", {
                message: "Auction ID is required for sync.",
            });
        }
        sendInitialData(auctionId);
    });

    // Tell the rooms this socket was in how many are left (counted after it has actually left)
    socket.on("disconnecting", () => {
        for (const room of socket.rooms) {
            if (room !== socket.id) setImmediate(() => emitViewerCount(room));
        }
    });

    // Manual poll (admin / assigned auctioneer). The server also starts one by itself when players run out.
    socket.on("makePoll", async ({ auctionId } = {}) => {
        if (!(await getControlledAuction(auctionId))) return;

        try {
            const started = await startPoll(auctionId);
            if (started.error) return socket.emit("error", { message: started.error });
        } catch (error) {
            console.error("Error creating poll:", error);
            socket.emit("pollError", { message: "Error creating poll", details: error.message });
        }
    });

    // Undo the most recent bid on the current player (a mistake or a dispute). The bid is removed only if it is
    // still the highest one, so it can never undo a newer bid that arrived a moment later.
    socket.on("undoLastBid", async ({ auctionId } = {}) => {
        try {
            const auction = await getControlledAuction(auctionId);
            if (!auction) return;
            if (!["active", "paused"].includes(auction.status) || !auction.currentPlayer) {
                return socket.emit("auctionError", { message: "There is no live player to undo a bid on" });
            }

            const bidsForPlayer = auction.bids.filter((b) => b.player.equals(auction.currentPlayer));
            const last = bidsForPlayer[bidsForPlayer.length - 1];
            if (!last) return socket.emit("auctionError", { message: "There is no bid to undo" });
            const before = bidsForPlayer[bidsForPlayer.length - 2];

            const updated = await Auction.findOneAndUpdate(
                {
                    _id: auctionId,
                    currentPlayer: auction.currentPlayer,
                    "currentBid.amount": last.amount,
                    "currentBid.team": last.team,
                },
                {
                    $pull: { bids: { _id: last._id } },
                    $set: {
                        currentBid: before ? { amount: before.amount, team: before.team, timestamp: before.timestamp } : null,
                    },
                    $push: {
                        logs: {
                            action: "info",
                            details: {
                                message: "Last bid undone",
                                player: auction.currentPlayer,
                                team: last.team,
                                amount: last.amount,
                                by: socket.data.user.id,
                            },
                            timestamp: new Date(),
                        },
                    },
                },
                { new: true }
            );
            if (!updated) {
                return socket.emit("auctionError", { message: "A newer bid just arrived. Check the screen and try again." });
            }

            // Don't leave the remaining bidders with a sliver of time
            if (updated.status === "active") {
                const extended = new Date(Date.now() + ANTI_SNIPE_MS);
                await Auction.updateOne({ _id: auctionId, timeRemaining: { $lt: extended } }, { timeRemaining: extended });
                startOrRefreshAuctionTimer(auctionId);
            }
            await broadcastAuction(auctionId);
        } catch (error) {
            socket.emit("auctionError", { message: error.message });
        }
    });

    socket.on("completeAuction", async ({ auctionId } = {}) => {
        if (!(await getControlledAuction(auctionId))) return;
        try {
            const auction = await Auction.findById(auctionId)
                .populate("players.player")
                .populate("results.player", "name nationality image basePrice role")
                .populate("results.soldTo", "logo name shortName")
                .populate("bids.player")
                .populate("bids.team")
                .exec();
            if (!auction) {
                return socket.emit("error", { message: "Auction not found" });
            }
            io.to(auctionId).emit("auctionUpdate", {
                auction,
            });
        } catch (error) {
            console.error("Error fetching auction details:", error);
            socket.emit("pollError", { message: "Error creating poll", details: error.message });
        }
    });

    socket.on("submitPollVote", async ({ auctionId, playerIds } = {}) => {
        // Only team owners registered in this auction may vote, and the voter is whoever is signed in on this
        // socket (never an id the client sends)
        const voter = socket.data.user;
        if (!voter || voter.role !== "user" || !voter.team) {
            return socket.emit("error", { message: "Only registered team owners can vote" });
        }
        if (!auctionId || !mongoose.Types.ObjectId.isValid(auctionId) || !Array.isArray(playerIds)) {
            return socket.emit("error", { message: "Auction ID and Player IDs array are required" });
        }
        if (!(await Auction.exists({ _id: auctionId, "teams.team": voter.team }))) {
            return socket.emit("error", { message: "Your team is not registered in this auction" });
        }
        const userId = voter.id;

        if (playerIds.length === 0) {
            return socket.emit("error", { message: "At least one player ID must be selected" });
        }

        try {
            if (!activeAuctions.has(auctionId) || !activeAuctions.get(auctionId).poll?.active) {
                return socket.emit("error", { message: "No active poll for this auction" });
            }

            const auctionData = activeAuctions.get(auctionId);

            if (auctionData.poll.voters.has(userId)) {
                return socket.emit("error", { message: "You have already voted" });
            }

            playerIds.forEach((playerId) => {
                auctionData.poll.votes[playerId] = (auctionData.poll.votes[playerId] || 0) + 1;
            });

            auctionData.poll.voters.add(userId);

            io.to(auctionId).emit("pollUpdate", {
                auctionId,
                votes: auctionData.poll.votes,
            });
        } catch (error) {
            console.error("Error processing poll votes:", error);
            socket.emit("error", { message: "Error processing your votes", details: error.message });
        }
    });
});

cron.schedule("* * * * *", async () => {
    try {
        const cursor = Auction.find({ status: { $in: ["scheduled", "active", "waiting"] } }).cursor();

        for (let auction = await cursor.next(); auction != null; auction = await cursor.next()) {
            const auctionId = auction._id.toString();

            // scheduled -> active once the start time has passed
            if (await auction.updateStatusByTime()) {
                io.to(auctionId).emit("statusUpdate", { auctionId: auction._id, status: auction.status });
            }
            if (auction.status === "waiting") {
                // Out of players with nothing running: vote on the unsold ones, or finish
                await handleExhausted(auctionId);
                continue;
            }
            if (auction.status !== "active") continue;

            if (!auction.currentPlayer) {
                if (auction.nextPlayerAt && auction.nextPlayerAt.getTime() > Date.now()) continue; // result still on screen
                // Just opened: bring up the first player (no visitor can trigger this any more)
                await advanceAuction(auctionId, { force: true });
            } else if (auction.timeRemaining.getTime() <= Date.now()) {
                await advanceAuction(auctionId);
            } else if (!activeAuctions.get(auctionId)?.timeout) {
                // e.g. the server restarted: put the clock back
                startOrRefreshAuctionTimer(auctionId);
            }
        }
    } catch (error) {
        console.error("Error in auction status cron job:", error);
    }
});

// Anything under /api that no route handled, then errors: always JSON, never an HTML error page
app.use("/api", (req, res) => res.status(404).json({ success: false, message: "Not found" }));

 
app.use((err, req, res, _next) => {
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ success: false, message: "The request body isn't valid JSON" });
    }
    if (err.type === "entity.too.large") {
        return res.status(413).json({ success: false, message: "The request is too large" });
    }
    console.error("Unhandled error:", err);
    res.status(err.status || 500).json({ success: false, message: "Internal server error" });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    connectDB();
    console.log(`Server running at http://localhost:${PORT}`);
});
