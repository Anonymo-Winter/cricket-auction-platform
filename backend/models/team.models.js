import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
    {
        // Basic Team Info
        name: {
            type: String,
            required: [true, "Team name is required"],
            trim: true,
            unique: true,
        },

        shortName: {
            type: String,
            trim: true,
            unique: true,
            default: function () {
                return this.name;
            },
        },

        logo: {
            type: String,
            required: [true, "Team logo is required"],
        },

        maxBidAmount: {
            type: Number,
            default: function () {
                return this.purseRemaining;
            },
            set: function (_value) {
                return this.purseRemaining;
            },
        },
        currentAuction: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Auction",
            default: null,
        },
        // Squad Composition
        players: [
            {
                player: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Player",
                    required: true,
                },
                // Squads carry over between auctions, so record where each player was won
                auction: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Auction",
                },
                purchasePrice: {
                    type: Number,
                    required: true,
                },
                nationality: {
                    type: String,
                    required: true,
                },
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        // Team Constraints
        currentSquadSize: {
            type: Number,
            default: 0,
        },
        theme: {
            type: String,
            default: "white",
        },
        overseasCount: {
            type: Number,
            default: 0,
        },

        // Ownership
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Auction Status
        auctionStatus: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },
        registeredAuction: [
            {
                auctionId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Auction",
                    required: true,
                },
                purseRemaining: {
                    type: Number,
                    required: true,
                    default: 10000000,
                    min: 0,
                    validate: {
                        validator: function (value) {
                            return value >= 0;
                        },
                        message: "Purse remaining cannot be negative",
                    },
                },
                startTime: {
                    type: Date,
                    require: true,
                },
                endTime: {
                    type: Date,
                    require: true,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

if (typeof window === "undefined") {
    teamSchema.index({ owner: 1 });
}

teamSchema.virtual("totalSpent").get(function () {
    return this.players.reduce((sum, p) => sum + p.purchasePrice, 0);
});

teamSchema.pre("save", async function (next) {
    this.currentSquadSize = this.players.length;

    const Player = mongoose.model("Player");
    const playerIds = this.players.map((p) => p.player);
    const players = await Player.find({ _id: { $in: playerIds } });
    this.overseasCount = players.filter((p) => p.nationality !== "Indian").length;

    const totalSpent = this.players.reduce((sum, p) => sum + p.purchasePrice, 0);
    this.purseRemaining = 100000000 - totalSpent; // 100 Crore - spent amount

    next();
});

teamSchema.methods = {
    canBidForPlayer: async function (player, bidAmount) {
        if (bidAmount > this.purseRemaining) {
            return {
                allowed: false,
                reason: "Insufficient purse balance",
            };
        }

        if (this.currentSquadSize >= 25) {
            return {
                allowed: false,
                reason: "Maximum squad size reached",
            };
        }

        if (player.nationality !== "Indian" && this.overseasCount >= 8) {
            return {
                allowed: false,
                reason: "Maximum overseas players limit reached",
            };
        }

        const minimumPlayersNeeded = 18 - this.currentSquadSize; // IPL minimum squad size is 18
        if (minimumPlayersNeeded > 0) {
            const minPurseNeeded = minimumPlayersNeeded * 2000000; // 20L minimum price per player
            if (this.purseRemaining - bidAmount < minPurseNeeded) {
                return {
                    allowed: false,
                    reason: "Must maintain minimum purse for required squad size",
                };
            }
        }

        return { allowed: true };
    },

    getSummary: function () {
        return {
            name: this.name,
            purseRemaining: this.purseRemaining,
            squadSize: this.currentSquadSize,
            overseasCount: this.overseasCount,
            requiredPlayers: Math.max(0, 18 - this.currentSquadSize),
        };
    },
};

const Team = mongoose.model("Team", teamSchema);

export default Team;
