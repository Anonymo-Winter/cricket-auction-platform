import mongoose from "mongoose";

const auctionHistorySchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, ref: "Auction", required: true },
    name: { type: String, required: true },
    teams: [
        {
            team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
            players: [
                {
                    player: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
                    purchasePrice: { type: Number, required: true },
                },
            ],
            totalSpent: { type: Number, default: 0 },
            playersBought: { type: Number, default: 0 },
            overseasPlayersBought: { type: Number, default: 0 },
            purseRemaining: { type: Number, default: 100000000 }, // 100 Crore
        },
    ],
    players: [
        {
            player: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
            soldTo: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
            soldPrice: { type: Number, required: true },
            highestBid: { type: Number, required: true },
        },
    ],
    summary: {
        totalPlayersSold: { type: Number, default: 0 },
        totalAmountSpent: { type: Number, default: 0 },
        overseasPlayersSold: { type: Number, default: 0 },
    },
    logs: [
        {
            event: { type: String, enum: ["sold", "unsold"] },
            player: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
            team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
            amount: { type: Number },
            timestamp: { type: Date, default: Date.now },
        },
    ],
    completedAt: { type: Date, default: Date.now },
});

// Indexes
auctionHistorySchema.index({ "teams.team": 1 });
auctionHistorySchema.index({ completedAt: -1 });

const AuctionHistory = mongoose.model("AuctionHistory", auctionHistorySchema);

export default AuctionHistory;
