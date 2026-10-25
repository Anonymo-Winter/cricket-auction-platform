import express from "express";
import {
    getTeamById,
    updateTeam,
    AddPlayersToTeam,
    deletePlayerFromTeam,
    createTeam,
    deleteTeam,
} from "../controllers/teamController.js";
import { verifyToken, requireRole } from "../middlewares/verifyToken.middleware.js";

const router = express.Router();

const adminOnly = [verifyToken, requireRole("admin")];

router.get("/:id", getTeamById);

router.put("/createTeam", ...adminOnly, createTeam);

router.patch("/update-team", ...adminOnly, updateTeam);

router.patch("/mark-players-to-team/:id", ...adminOnly, AddPlayersToTeam);

router.delete("/delete-player-from-team", ...adminOnly, deletePlayerFromTeam);

router.delete("/delete-team/:id", ...adminOnly, deleteTeam);

export default router;
