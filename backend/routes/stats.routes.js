import express from "express";
import { auctionStats } from "../services/auctionReports.js";

const router = express.Router();

// Results across every auction
router.get("/overview", async (req, res) => {
    try {
        return res.status(200).json({ success: true, ...(await auctionStats()) });
    } catch (error) {
        console.error("Error building overview stats:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// Results for one auction
router.get("/auction/:id", async (req, res) => {
    try {
        const stats = await auctionStats({ auctionId: req.params.id });
        if (!stats) return res.status(404).json({ success: false, message: "Auction not found" });
        return res.status(200).json({ success: true, ...stats });
    } catch (error) {
        console.error("Error building auction stats:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

export default router;
