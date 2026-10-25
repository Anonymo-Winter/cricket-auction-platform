import mongoose from "mongoose";

const playerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        dateOfBirth: {
            type: Date,
            required: [true, "Date of birth is required"],
            validate: {
                validator: function (value) {
                    return value <= new Date();
                },
                message: "Date of birth cannot be in the future",
            },
        },
        nationality: {
            type: String,
            required: [true, "Nationality is required"],
            trim: true,
        },
        image: {
            type: String,
            default: "default-player.png",
        },

        // Player Type & Role
        role: {
            type: String,
            required: [true, "Role is required"],
            enum: ["batsman", "bowler", "all-rounder", "wicket-keeper", "wicket-keeper-batsman"],
        },
        battingStyle: {
            type: String,
            enum: ["right-handed", "left-handed"],
            required: true,
        },
        bowlingStyle: {
            type: String,
            enum: [
                "right-arm-fast",
                "right-arm-medium",
                "right-arm-off-spin",
                "right-arm-leg-spin",
                "left-arm-fast",
                "left-arm-medium",
                "left-arm-spin",
                "none",
            ],
            default: "none",
        },

        // IPL Experience
        previousTeams: [
            {
                team: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Team",
                },
                season: Number,
                price: Number,
            },
        ],
        iplDebut: {
            type: Number,
            required: true,
        },
        matches: {
            type: Number,
            required: true,
            default: 0,
        },

        // Batting Statistics
        battingStats: {
            innings: { type: Number, default: 0 },
            runs: { type: Number, default: 0 },
            average: { type: Number, default: 0 },
            strike_rate: { type: Number, default: 0 },
            highest_score: { type: Number, default: 0 },
            fifties: { type: Number, default: 0 },
            centuries: { type: Number, default: 0 },
            fours: { type: Number, default: 0 },
            sixes: { type: Number, default: 0 },
            notOuts: { type: Number, default: 0 },
        },

        // Bowling Statistics
        bowlingStats: {
            innings: { type: Number, default: 0 },
            overs: { type: Number, default: 0 },
            wickets: { type: Number, default: 0 },
            economy: { type: Number, default: 0 },
            average: { type: Number, default: 0 },
            best_figures: {
                wickets: { type: Number, default: 0 },
                runs: { type: Number, default: 0 },
            },
            five_wickets: { type: Number, default: 0 },
            dot_balls: { type: Number, default: 0 },
            runs_conceded: { type: Number, default: 0 },
        },
        wicketkeeper: {
            catches: { type: Number, default: 0 },
            stumps: { type: Number, default: 0 },
        },
        // Auction Related Information
        basePrice: {
            type: Number,
            required: [true, "Base price is required"],
        },
        currentPrice: {
            type: Number,
            default: function () {
                return this.basePrice;
            },
        },
        soldPrice: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ["unsold", "sold", "available"],
            default: "unsold",
        },
        currentTeam: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Team",
            default: null,
        },
        currentAuction: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Auction",
            default: null,
        },
        // Performance Indicators
        specializations: [
            {
                type: String,
            },
        ],
        rankings: {
            t20: { type: Number },
            ipl: { type: Number },
        },

        // Additional Info
        isUncapped: {
            type: Boolean,
            default: true,
        },
        internationalCaps: {
            tests: { type: Number, default: 0 },
            odis: { type: Number, default: 0 },
            t20is: { type: Number, default: 0 },
        },
        availability: {
            type: String,
            enum: ["full-season", "partial-season"],
            default: "full-season",
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
playerSchema.index({ name: 1 });
playerSchema.index({ status: 1 });
playerSchema.index({ role: 1 });
playerSchema.index({ nationality: 1 });

playerSchema.virtual("age").get(function () {
    return Math.floor((new Date() - this.dateOfBirth) / (365.25 * 24 * 60 * 60 * 1000));
});

playerSchema.virtual("isOverseas").get(function () {
    return this.nationality !== "Indian";
});

playerSchema.virtual("iplExperience").get(function () {
    const currentYear = new Date().getFullYear();
    return currentYear - this.iplDebut;
});

playerSchema.methods = {
    updateStats: function (newStats) {
        if (!newStats || (newStats.batting && newStats.bowling)) {
            throw new Error("Invalid stats format");
        }
        if (this.role === "batsman" || this.role === "all-rounder") {
            this.battingStats = { ...this.battingStats, ...newStats.batting };
        }
        if (this.role === "bowler" || this.role === "all-rounder") {
            this.bowlingStats = { ...this.bowlingStats, ...newStats.bowling };
        }
    },

    getValueEstimate: function () {
        let value = this.basePrice;

        value += this.matches * 100000; // 1L per match

        if (this.role.includes("batsman")) {
            value += this.battingStats.average * 100000 + this.battingStats.strike_rate * 10000;
        }

        if (this.role.includes("bowler")) {
            value += this.bowlingStats.wickets * 200000 - this.bowlingStats.economy * 100000;
        }

        return Math.max(value, this.basePrice);
    },

    isMarqueePlayer: function () {
        return (
            this.internationalCaps.tests > 20 || this.internationalCaps.odis > 50 || this.internationalCaps.t20is > 30
        );
    },
};

playerSchema.pre("save", function (next) {
    if (this.battingStats.innings > 0) {
        this.battingStats.average = this.battingStats.runs / (this.battingStats.innings - this.battingStats.notOuts);
    }

    if (this.bowlingStats.wickets > 0) {
        this.bowlingStats.average = this.bowlingStats.runs_conceded / this.bowlingStats.wickets;
    }

    next();
});

const Player = mongoose.model("Player", playerSchema);

export default Player;
