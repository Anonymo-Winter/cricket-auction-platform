import express from "express";
import {
    getAllPlayers,
    getAvailablePlayers,
    getPlayersId,
    updatePlayer,
    deletePlayer,
    createPlayer,
    importPlayers,
} from "../controllers/playerController.js";
import { verifyToken, requireRole } from "../middlewares/verifyToken.middleware.js";

const router = express.Router();

const adminOnly = [verifyToken, requireRole("admin")];

router.get("/", getAllPlayers);
router.get("/:id", getPlayersId);
router.get("/availablePlayers/:teamId", getAvailablePlayers);
router.patch("/update-player/:id", ...adminOnly, updatePlayer);
router.delete("/delete-player/:id", ...adminOnly, deletePlayer);
router.put("/createPlayer", ...adminOnly, createPlayer);
router.post("/import", ...adminOnly, importPlayers);
export default router;
