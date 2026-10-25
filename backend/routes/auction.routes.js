import express from "express";
import {
    startAuction,
    getAllAuctionsData,
    getAuctionsById,
    markPlayersToSets,
    updateAuction,
    getAvailablePlayers,
    getAllTeams,
    addPlayersToAuction,
    addTeamsToAuction,
    getAllAvailableTeams,
    deleteTeamsFromAuction,
    getAllAvailableAuctions,
    deletePlayerFromAuction,
    getSummaryStats,
    deleteAuction,
    createNewAuction,
    getAssignedAuctions,
    stopAuction,
    completedAuction,
    registerToAuction,
    fetchAuctionHistory,
    getAuctionTeamsSummary,
    getAuctionSquads,
    exportAuctionSquadsCsv,
} from "../controllers/auctionController.js";
import { verifyToken, requireRole, requireSelfOrAdmin, requireOwnTeam } from "../middlewares/verifyToken.middleware.js";

const router = express.Router();

const adminOnly = [verifyToken, requireRole("admin")];
const staff = [verifyToken, requireRole("admin", "auctioneer")];

// ---- Public reads ----
router.get("/", getAllAuctionsData);

router.get("/getsummaryStats", getSummaryStats);

router.get("/available-auctions", getAllAvailableAuctions);

router.get("/getAllTeams", getAllTeams);

router.get("/getAllAvailableTeams/:auctionId", getAllAvailableTeams);

router.get("/fetch-auction-history/:id", fetchAuctionHistory);

router.get("/available-players/:id", getAvailablePlayers);

// ---- Auctioneer / admin ----
router.get("/getAssignedAuctions/:id", ...staff, requireSelfOrAdmin("id"), getAssignedAuctions);

router.post("/stop-auction/:id", ...staff, stopAuction);

router.post("/start-auction/:id", ...staff, startAuction);

router.post("/complete-auction/:id", ...staff, completedAuction);

// ---- Team owners ----
router.post("/register-to-auction", verifyToken, requireRole("user"), requireOwnTeam, registerToAuction);

// ---- Admin only ----
router.post("/create-new-auction", ...adminOnly, createNewAuction);

router.patch("/add-players-to-auction/:id", ...adminOnly, addPlayersToAuction);

router.patch("/add-teams-to-auction/:id", ...adminOnly, addTeamsToAuction);

router.patch("/update-auction", ...adminOnly, updateAuction);

router.patch("/mark-players-to-sets", ...adminOnly, markPlayersToSets);

router.delete("/delete-teams-from-auction/:id", ...adminOnly, deleteTeamsFromAuction);

router.delete("/delete-player-from-auction/:id", ...adminOnly, deletePlayerFromAuction);

router.delete("/:id", ...adminOnly, deleteAuction);

router.get("/:id/teams-summary", getAuctionTeamsSummary);

router.get("/:id/squads", getAuctionSquads);

router.get("/:id/squads.csv", exportAuctionSquadsCsv);

// Keep parameterised GET last so it does not shadow the fixed paths above
router.get("/:id", getAuctionsById);

export default router;
