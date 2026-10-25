import mongoose from "mongoose";

// One-time links: auctioneer invites, team-owner invites and password resets.
// Only a SHA-256 hash of the token is stored, so a database leak does not expose usable links.
const tokenSchema = new mongoose.Schema(
    {
        tokenHash: { type: String, required: true, unique: true },
        type: {
            type: String,
            enum: ["auctioneer-invite", "owner-invite", "password-reset"],
            required: true,
        },
        email: { type: String, trim: true },
        name: { type: String, trim: true },
        // password-reset: the account being reset
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        expiresAt: { type: Date, required: true },
        usedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

// Remove tokens 30 days after they expire
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export default mongoose.model("Token", tokenSchema);
