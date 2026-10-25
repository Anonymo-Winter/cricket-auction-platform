import express from "express";
import Player from "../models/player.models.js";
import Auction from "../models/auction.models.js";

const router = express.Router();

router.get("/players", async (req, res) => {
    try {
        const players = await Player.find();
        return res.status(200).json(players);
    } catch (error) {
        console.error("Error fetching players:", error);
        return res.status(400).json({ message: error.message });
    }
});
router.get("/auctions", async (req, res) => {
    try {
        // The rules and the sizes are shown on the auction cards, so return them without the heavy arrays
        const auctions = await Auction.aggregate([
            {
                $project: {
                    name: 1,
                    season: 1,
                    startTime: 1,
                    endTime: 1,
                    status: 1,
                    currentRound: 1,
                    updatedAt: 1,
                    settings: 1,
                    teamCount: { $size: { $ifNull: ["$teams", []] } },
                    playerCount: { $size: { $ifNull: ["$players", []] } },
                },
            },
        ]);
        return res.status(200).json(auctions);
    } catch (error) {
        console.error("Error fetching auctions:", error);
        return res.status(400).json({ message: error.message });
    }
});

export default router;
