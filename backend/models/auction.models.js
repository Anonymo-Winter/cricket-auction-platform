import mongoose from "mongoose";
import Team from "./team.models.js";
import Player from "./player.models.js";

const auctionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Auction name is required"],
            unique: true,
            trim: true,
        },
        season: {
            type: Number,
            required: [true, "Season year is required"],
        },
        startTime: {
            type: Date,
            required: [true, "Start time is required"],
        },
        endTime: {
            type: Date,
            required: [true, "End time is required"],
        },
        // Auction Status & Control
        status: {
            type: String,
            enum: ["scheduled", "active", "paused", "completed", "cancelled", "waiting"],
            default: "scheduled",
        },
        currentRound: {
            type: Number,
            default: 1,
        },
        currentPlayer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Player",
        },
        currentBid: {
            amount: Number,
            team: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Team",
            },
            timestamp: Date,
        },

        // Auction Configuration
        settings: {
            minBidIncrement: {
                type: Number,
                default: 100000, // 1 Lakh minimum increment
            },
            bidTimeLimit: {
                type: Number,
                default: 30, // seconds
            },
            maxPursePerTeam: {
                type: Number,
                default: 100000000, // 100 Crore
            },
            maxOverseasPlayers: {
                type: Number,
                default: 8,
            },
            maxSquadSize: {
                type: Number,
                default: 25,
            },
            minSquadSize: {
                type: Number,
                default: 18,
            },
        },
        timeRemaining: {
            type: Date,
            default: () => new Date(Date.now() + 60 * 1000),
        },
        pausedTimeRemaining: {
            type: Number,
            default: 60,
        },
        // Set while the "SOLD / UNSOLD" result is on screen: nobody is up for auction until this moment, so the
        // next player's clock never runs behind the result banner
        nextPlayerAt: {
            type: Date,
            default: null,
        },
        // Taken for a few seconds while an auction moves to its next player, so two server processes can never
        // sell the same player twice
        advanceLockUntil: {
            type: Date,
            default: null,
        },
        auctioneer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        // Players Management
        players: [
            {
                player: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Player",
                },
                status: {
                    type: String,
                    enum: ["pending", "current", "sold", "unsold"],
                    default: "pending",
                },
                order: Number,
                set: {
                    type: String,
                    enum: ["marquee", "capped", "uncapped", "accelerated"],
                },
            },
        ],

        // Bidding History
        bids: [
            {
                player: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Player",
                },
                team: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Team",
                },
                amount: {
                    type: Number,
                    required: true,
                },
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
                type: {
                    type: String,
                    enum: ["normal"],
                    default: "normal",
                },
                status: {
                    type: String,
                    enum: ["active", "won", "outbid", "invalid"],
                    default: "active",
                },
            },
        ],

        // Participating Teams
        teams: [
            {
                team: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Team",
                },
                purseRemaining: {
                    type: Number,
                    default: 100000000, // 100 Crore
                },
                playersAcquired: {
                    type: Number,
                    default: 0,
                },
                isActive: {
                    type: Boolean,
                    default: true,
                },
            },
        ],

        activePoll: {
            active: { type: Boolean, default: false },
            completed: { type: Boolean, default: false },
            votes: {
                type: Map,
                of: { type: Number, default: 0 },
                default: {},
            },
            voters: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
            startTime: { type: Date },
            duration: {
                type: Number,
                min: 0,
            },
        },
        // Auction Results
        results: [
            {
                player: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Player",
                },
                soldTo: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Team",
                },
                amount: Number,
                timestamp: Date,
                type: {
                    type: String,
                    enum: ["normal"],
                    default: "normal",
                },
            },
        ],

        // Auction Logs
        logs: [
            {
                action: {
                    type: String,
                    enum: [
                        "start",
                        "pause",
                        "resume",
                        "bid",
                        "sold",
                        "unsold",
                        "complete",
                        "waiting",
                        "reset_purse",
                        "info",
                    ],
                },
                details: mongoose.Schema.Types.Mixed,
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        versionKey: false,
        timestamps: true,
    }
);

auctionSchema.index({ status: 1 });
auctionSchema.index({ season: 1 });
auctionSchema.index({ "players.player": 1 });
auctionSchema.index({ "teams.team": 1 });

auctionSchema.pre("save", function (next) {
    if (this.endTime <= this.startTime) {
        return next(new Error("End time must be after start time"));
    }

    if (this.currentBid && this.currentBid.amount) {
        const lastBid = this.bids[this.bids.length - 1];

        if (lastBid && this.currentBid.amount < lastBid.amount) {
            return next(new Error("New bid must be higher than current bid"));
        }
    }

    next();
});

auctionSchema.methods = {
    startAuction: async function () {
        if (this.status !== "scheduled" && this.status !== "waiting" && this.status !== "paused") {
            throw new Error("Auction can only be started from scheduled or paused status");
        }
        this.status = "active";
        this.logs.push({ action: "start" });
        await this.save();
    },
    markPlayerAsSold: async function (playerId, teamId, amount, type = "auction") {
        const playerInAuction = this.players.find((p) => p.player._id.toString() === playerId.toString());
        if (!playerInAuction) {
            throw new Error("Player not found in auction");
        }

        const teamData = await Team.findById(teamId);
        if (!teamData) {
            throw new Error("Team not found");
        }

        const team = this.teams.find((t) => t.team.toString() === teamId.toString());
        if (!team) {
            throw new Error("Team not found in auction");
        }

        const playerData = await Player.findById(playerId);
        if (!playerData) {
            throw new Error("Player not found");
        }

        playerInAuction.status = "sold";

        // The purse is spent when the player is SOLD (bids only reserve nothing), once per sale
        team.purseRemaining -= amount;
        team.playersAcquired += 1;

        if (team.playersAcquired >= this.settings.maxSquadSize) {
            this.logs.push({
                action: "info",
                details: {
                    message: `Team has reached maximum squad size`,
                    team: teamId,
                    maxSquadSize: this.settings.maxSquadSize,
                },
                timestamp: new Date(),
            });
        }

        // Keep the team's own per-auction purse in step with this auction's
        const participation = teamData.registeredAuction?.find((r) => r.auctionId?.equals(this._id));
        if (participation) {
            participation.purseRemaining = team.purseRemaining;
        }

        teamData.players.push({
            player: playerId,
            auction: this._id,
            purchasePrice: amount,
            timestamp: new Date(),
            nationality: playerData.nationality,
        });

        await teamData.save();

        this.results.push({
            player: playerId,
            soldTo: teamId,
            amount: amount,
            timestamp: new Date(),
            type: type,
        });

        this.logs.push({
            action: "sold",
            details: {
                player: playerId,
                team: teamId,
                amount: amount,
            },
            timestamp: new Date(),
        });

        await this.save();
    },
    checkTeamEligibility: function (teamId) {
        const team = this.teams.find((t) => t.team.toString() === teamId.toString());

        if (!team) {
            return {
                eligible: false,
                reason: "Team not found in auction",
            };
        }

        if (team.playersAcquired >= this.settings.maxSquadSize) {
            return {
                eligible: false,
                reason: `Maximum squad size (${this.settings.maxSquadSize}) reached`,
            };
        }

        if (team.purseRemaining < this.settings.minBidIncrement) {
            return {
                eligible: false,
                reason: "Insufficient purse remaining for minimum bid",
            };
        }

        return {
            eligible: true,
        };
    },
    markPlayerAsUnsold: async function (playerId) {
        const playerInAuction = this.players.find((p) => p.player._id.toString() === playerId.toString());

        if (!playerInAuction) {
            throw new Error("Player not found in auction");
        }

        playerInAuction.status = "unsold";

        // They are no longer being bid on, so their "current price" goes back to the base price
        await Player.updateOne({ _id: playerId }, [{ $set: { currentPrice: "$basePrice" } }]);

        this.logs.push({
            action: "unsold",
            details: {
                player: playerId,
            },
            timestamp: new Date(),
        });

        await this.save();
    },
    pauseAuction: async function () {
        if (this.status !== "active") {
            throw new Error("Only an active auction can be paused");
        }
        // Remember how much of the current player's clock was left
        this.pausedTimeRemaining = Math.max(0, Math.ceil((new Date(this.timeRemaining).getTime() - Date.now()) / 1000));
        this.status = "paused";
        this.logs.push({ action: "pause", timestamp: new Date() });
        await this.save();
    },
    resumeAuction: async function () {
        if (this.status !== "paused") {
            throw new Error("Only a paused auction can be resumed");
        }
        const seconds = this.pausedTimeRemaining > 0 ? this.pausedTimeRemaining : this.settings.bidTimeLimit;
        this.timeRemaining = new Date(Date.now() + seconds * 1000);
        this.status = "active";
        this.logs.push({ action: "resume", timestamp: new Date() });
        await this.save();
    },
    skipToNextPlayer: async function () {
        const currentPlayerInAuction = this.players.find((p) => p.status === "current");

        if (currentPlayerInAuction) {
            currentPlayerInAuction.status = "unsold";

            this.logs.push({
                action: "unsold",
                details: {
                    player: this.currentPlayer,
                    skipped: true,
                },
                timestamp: new Date(),
            });
        }

        const nextPlayer = this.players.find((p) => p.status === "pending");

        if (!nextPlayer) {
            this.currentPlayer = null;
            this.currentBid = null;
            this.status = "waiting";
            this.timeRemaining = 0;
            this.logs.push({ action: "waiting" });
        } else {
            this.currentPlayer = nextPlayer.player;
            nextPlayer.status = "current";

            this.currentBid = null;

            this.timeRemaining = new Date(Date.now() + this.settings.bidTimeLimit * 1000);

            this.logs.push({
                action: "resume",
                details: {
                    player: nextPlayer.player,
                },
                timestamp: new Date(),
            });
        }

        await this.save();

        return this;
    },
    // Sells (or passes on) whoever is up now. The sale is decided by the LIVE bid for this turn (reset for every
    // player, moved back by an undo). Looking through every bid ever recorded for the player would let a bid from an
    // earlier round (a skipped player brought back by the owners' vote) decide the sale.
    resolveCurrentPlayer: async function () {
        const currentPlayerInAuction = this.players.find((p) => p.status === "current");
        if (!currentPlayerInAuction) return null;
        this.currentPlayer = currentPlayerInAuction.player._id || currentPlayerInAuction.player;

        if (this.currentBid?.amount && this.currentBid?.team) {
            await this.markPlayerAsSold(this.currentPlayer, this.currentBid.team, this.currentBid.amount, "normal");
        } else {
            await this.markPlayerAsUnsold(this.currentPlayer);
        }
        return currentPlayerInAuction;
    },
    // After a result: nobody is up for auction for `ms` milliseconds (the result banner), then the next player comes
    holdForNextPlayer: async function (ms) {
        this.currentPlayer = null;
        this.currentBid = null;
        this.timeRemaining = 0;
        this.nextPlayerAt = new Date(Date.now() + ms);
        await this.save();
        return this;
    },
    moveToNextPlayer: async function () {
        const currentPlayerInAuction = await this.resolveCurrentPlayer();
        this.nextPlayerAt = null;

        const setPriority = ["marquee", "capped", "uncapped", "accelerated"];

        let currentSetIndex = -1;
        if (currentPlayerInAuction) {
            currentSetIndex = setPriority.indexOf(currentPlayerInAuction.set);
        }

        let nextPlayer = null;
        if (currentSetIndex >= 0) {
            const currentSet = setPriority[currentSetIndex];
            nextPlayer = this.players.find((p) => p.status === "pending" && p.set === currentSet);
        }

        if (!nextPlayer) {
            for (let i = 0; i < setPriority.length; i++) {
                if (i > currentSetIndex || currentSetIndex === -1) {
                    nextPlayer = this.players.find((p) => p.status === "pending" && p.set === setPriority[i]);
                    if (nextPlayer) break;
                }
            }
        }

        if (!nextPlayer && currentSetIndex !== -1) {
            for (let i = 0; i <= currentSetIndex; i++) {
                nextPlayer = this.players.find((p) => p.status === "pending" && p.set === setPriority[i]);
                if (nextPlayer) break;
            }
        }

        if (!nextPlayer) {
            this.currentPlayer = null;
            this.currentBid = null;
            this.status = "waiting";
            this.timeRemaining = 0;
            this.logs.push({
                action: "waiting",
                details: { message: "No more players available in any set" },
                timestamp: new Date(),
            });
        } else {
            this.currentPlayer = nextPlayer.player;
            nextPlayer.status = "current";

            this.currentBid = null;

            this.timeRemaining = new Date(Date.now() + this.settings.bidTimeLimit * 1000);

            this.logs.push({
                action: "resume",
                details: {
                    player: nextPlayer.player,
                    set: nextPlayer.set,
                },
                timestamp: new Date(),
            });
        }

        await this.save();
        return this;
    },
    getSummary: function () {
        return {
            totalPlayers: this.players.length,
            soldPlayers: this.results.length,
            currentRound: this.currentRound,
            totalAmount: this.results.reduce((sum, r) => sum + r.amount, 0),
        };
    },
    // Scheduled auctions open automatically at their start time. Returns true if the status changed.
    updateStatusByTime: async function () {
        if (this.status !== "scheduled") return false;

        const now = new Date();
        if (now < new Date(this.startTime)) return false;

        this.status = "active";
        this.logs.push({ action: "start", timestamp: now });
        await this.save();
        return true;
    },
};

const bidError = (message, status = 400) => Object.assign(new Error(message), { status });

const isOverseasNationality = (nationality) => !!nationality && nationality.trim().toLowerCase() !== "indian";

// Places a bid with ONE conditional database update, so two simultaneous bids can never both win:
// the update only applies if the auction is still active, it is still this player, the clock has not
// run out, the new amount still beats the current bid, the bidder is not already leading and the
// team can afford it. Returns the updated auction, or null if the bid lost a race.
// Throws an Error with .status for bids that are plainly invalid, so the bidder sees why.
auctionSchema.statics.placeBidAtomic = async function ({ auctionId, playerId, teamId, amount }) {
    const auction = await this.findById(auctionId)
        .select("status currentPlayer currentBid settings teams players timeRemaining")
        .lean();
    if (!auction) throw bidError("Auction not found", 404);
    if (auction.status !== "active") throw bidError(`Auction is ${auction.status}`);
    if (auction.currentPlayer?.toString() !== String(playerId)) {
        throw bidError("Bid can only be placed for the current player");
    }
    if (new Date(auction.timeRemaining).getTime() <= Date.now()) {
        throw bidError("Bidding is closed for this player.");
    }

    const entry = auction.teams.find((t) => t.team.toString() === String(teamId));
    if (!entry || !entry.isActive) throw bidError("Team is not active in this auction");
    if (entry.playersAcquired >= auction.settings.maxSquadSize) {
        throw bidError("Team has already reached maximum squad size");
    }
    if (auction.currentBid?.team?.toString() === String(teamId)) {
        throw bidError("Your team already has the highest bid");
    }

    const player = await Player.findById(playerId).select("basePrice nationality").lean();
    if (!player) throw bidError("Player not found", 404);

    // Overseas limit. It counts the whole squad, including players kept from earlier auctions
    if (isOverseasNationality(player.nationality)) {
        const squad = await Team.findById(teamId).select("players.player").lean();
        const squadIds = (squad?.players || []).map((p) => p.player);
        const overseasOwned = squadIds.length
            ? await Player.countDocuments({ _id: { $in: squadIds }, nationality: { $not: /^\s*indian\s*$/i } })
            : 0;
        if (overseasOwned >= auction.settings.maxOverseasPlayers) {
            throw bidError(`Your squad already has the maximum of ${auction.settings.maxOverseasPlayers} overseas players`);
        }
    }

    const increment = auction.settings.minBidIncrement;
    const minimum = auction.currentBid?.amount ? auction.currentBid.amount + increment : player.basePrice || increment;
    if (amount < minimum) throw bidError(`Bid must be at least ${minimum}`);

    // The team must keep enough purse to still fill its minimum squad at the cheapest remaining base price
    const stillNeeded = Math.max(0, auction.settings.minSquadSize - (entry.playersAcquired + 1));
    let reserve = 0;
    if (stillNeeded > 0) {
        const pendingIds = auction.players.filter((p) => p.status === "pending").map((p) => p.player);
        if (pendingIds.length > 0) {
            const cheapest = await Player.findOne({ _id: { $in: pendingIds } })
                .sort({ basePrice: 1 })
                .select("basePrice")
                .lean();
            reserve = (cheapest?.basePrice || 0) * Math.min(stillNeeded, pendingIds.length);
        }
    }
    if (entry.purseRemaining < amount) throw bidError("Team does not have sufficient purse remaining");
    if (entry.purseRemaining < amount + reserve) {
        throw bidError("That bid would leave too little purse to complete the minimum squad");
    }

    const now = new Date();
    return this.findOneAndUpdate(
        {
            _id: auctionId,
            status: "active",
            currentPlayer: playerId,
            timeRemaining: { $gt: now },
            $or: [{ currentBid: null }, { "currentBid.amount": { $exists: false } }, { "currentBid.amount": { $lte: amount - increment } }],
            "currentBid.team": { $ne: teamId },
            teams: {
                $elemMatch: {
                    team: teamId,
                    isActive: true,
                    purseRemaining: { $gte: amount + reserve },
                    playersAcquired: { $lt: auction.settings.maxSquadSize },
                },
            },
        },
        {
            $set: { currentBid: { amount, team: teamId, timestamp: now } },
            $push: {
                bids: { player: playerId, team: teamId, amount, timestamp: now, type: "normal", status: "active" },
                logs: { action: "bid", details: { player: playerId, team: teamId, amount }, timestamp: now },
            },
        },
        { new: true }
    );
};

const Auction = mongoose.model("Auction", auctionSchema);

export default Auction;
