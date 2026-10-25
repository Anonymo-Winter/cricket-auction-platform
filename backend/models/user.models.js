import mongoose from "mongoose";
import { genSalt, hash } from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [8, "Password must be at least 8 characters long"],
        },
        role: {
            type: String,
            required: [true, "Role is required"],
            enum: ["admin", "auctioneer", "user"],
        },

        // Team Management - just keep the reference
        team: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Team",
            default: null,
        },

        // Auction Participation - simplified
        auctionStatus: {
            isActive: {
                type: Boolean,
                default: false,
            },
            lastBidTime: {
                type: Date,
                default: null,
            },
        },

        assignedAuctions: [
            {
                auctionId: { type: mongoose.Schema.Types.ObjectId, ref: "Auction" },
                startTime: Date,
                endTime: Date,
            },
        ],
        biddingHistory: [
            {
                player: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Player",
                },
                bidAmount: Number,
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
                status: {
                    type: String,
                    enum: ["won", "lost", "outbid"],
                    required: true,
                },
                round: {
                    type: Number,
                    required: true,
                },
            },
        ],

        // Session Management
        lastLogin: Date,
        sessionToken: String,
        status: {
            type: String,
            enum: ["active", "inactive", "suspended"],
            default: "active",
        },

        // Auction Permissions
        permissions: {
            type: Object,
            default: function () {
                const permissions = {};
                if (this.role === "user") {
                    permissions.canBid = true;
                } else if (this.role === "auctioneer") {
                    permissions.canManageAuction = true;
                } else if (this.role === "admin") {
                    permissions.canManageUsers = true;
                }
                return permissions;
            },
        },
    },
    {
        timestamps: true,
    }
);

if (typeof window === "undefined") {
    // Only run in Node.js environment, not in browser
    userSchema.index({ role: 1 });
    userSchema.index({ team: 1 });
    userSchema.index({ "auctionStatus.isActive": 1 });
}

userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        const salt = await genSalt(10);
        this.password = await hash(this.password, salt);
    }
    next();
});

userSchema.methods = {
    canBid: function () {
        return (
            this.status === "active" && this.role === "user" && this.permissions.canBid && this.auctionStatus.isActive
        );
    },

    recordBid: async function (playerId, amount) {
        if (!this.canBid()) {
            throw new Error("User is not allowed to bid. Check status, role, or permissions.");
        }
        this.biddingHistory.push({
            player: playerId,
            bidAmount: amount,
            status: "outbid",
            timestamp: new Date(),
            round: 1,
        });
        this.auctionStatus.lastBidTime = new Date();
        await this.save();
    },

    getBiddingStats: function () {
        return {
            totalBids: this.biddingHistory.length,
            wonBids: this.biddingHistory.filter((bid) => bid.status === "won").length,
        };
    },
};

const User = mongoose.model("User", userSchema);

export default User;
