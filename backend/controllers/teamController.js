import mongoose from "mongoose";
import Player from "../models/player.models.js";
import Team from "../models/team.models.js";
import User from "../models/user.models.js";

export const getTeamById = async (req, res) => {
    const id = req.params.id;
    try {
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid auction ID format",
            });
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid team ID format",
            });
        }
        const team = await Team.findById(id).populate("players.player").populate("players.auction", "name season");

        if (!team) {
            return res.status(404).json({
                success: false,
                message: "Team not found",
            });
        }

        res.status(200).send(team);
    } catch (error) {
        console.error("Error occurred while fetching auction by ID:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const updateTeam = async (req, res) => {
    const { updatedData, id } = req.body;

    try {
        if (!id) {
            return res.status(400).json({ message: "Team Id Not Provided" });
        }
        if (!updatedData || updatedData.length === 0) {
            return res.status(400).json({ message: "Empty Team Data" });
        }

        const auctionExists = await Team.findById(id);
        if (!auctionExists) {
            return res.status(404).json({ error: "Team not found" });
        }
        await Team.findByIdAndUpdate(id, {
            $set: {
                name: updatedData.name,
                shortName: updatedData.shortName,
                logo: updatedData.logo,
                purseRemaining: updatedData.purseRemaining,
                maxBidAmount: updatedData.maxBidAmount,
                currentSquadSize: updatedData.currentSquadSize,
                overseasCount: updatedData.overseasCount,
                owner: updatedData.owner,
            },
            new: true,
        }).populate("players.player");
        return res.status(200).json({ message: "Team Details Updated Successfully!" });
    } catch (error) {
        console.error("Error updating team details:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const AddPlayersToTeam = async (req, res) => {
    const { id } = req.params;
    const { updatedData } = req.body;
    try {
        if (!id) {
            return res.status(400).json({ message: "Team ID Not Provided" });
        }
        if (!updatedData || updatedData.length === 0) {
            return res.status(400).json({ message: "Empty Player Data" });
        }

        const team = await Team.findById(id);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Use a loop instead of map to await each operation
        for (const { id: playerId, teamId, purchasePrice, nationality } of updatedData) {
            if (!teamId) continue;
            const player = await Player.findById(playerId);
            if (!player) {
                return res.status(404).json({ message: `Player with ID ${playerId} not found` });
            }

            const updateFields = {
                $push: {
                    players: {
                        player: new mongoose.Types.ObjectId(playerId),
                        purchasePrice: purchasePrice || player.purchasePrice,
                        nationality: nationality || player.nationality,
                    },
                },
                $inc: { currentSquadSize: 1 },
            };

            if ((nationality || player.nationality) !== "Indian") {
                updateFields.$inc.overseasPlayers = 1;
            }

            await Team.findByIdAndUpdate(teamId, updateFields);
            await Player.findByIdAndUpdate(playerId, {
                $set: {
                    currentTeam: teamId,
                    previousTeams: {
                        team: teamId,
                        season: 2024,
                        price: player.currentPrice,
                    },
                },
            });
        }

        const updatedTeam = await Team.findById(id).populate("players.player");
        return res.status(200).json({ success: true, team: updatedTeam });
    } catch (error) {
        console.error("Error occurred while adding players:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const deletePlayerFromTeam = async (req, res) => {
    const { teamId, playerId } = req.body;
    try {
        if (!teamId) {
            return res.status(400).json({ message: "Team ID Not Provided" });
        }
        if (!playerId) {
            return res.status(400).json({ message: "Player ID Not Provided" });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        const player = await Player.findById(playerId);
        if (!player) {
            return res.status(404).json({ message: "Player not found" });
        }

        const playerData = team.players.find((p) => p.player.toString() === playerId);
        if (!playerData) {
            return res.status(404).json({ message: "Player not found in the team" });
        }

        const updateFields = {
            $pull: { players: { player: playerId } },
            $inc: { currentSquadSize: -1 },
        };

        // If the removed player is an overseas player, decrement overseasPlayers count
        if (playerData.nationality !== "Indian") {
            updateFields.$inc.overseasPlayers = -1;
        }

        const updatedTeam = await Team.findByIdAndUpdate(teamId, updateFields, { new: true }).populate(
            "players.player"
        );

        await Player.findByIdAndUpdate(playerId, { $set: { currentTeam: null } });

        return res.status(200).json({ success: true, team: updatedTeam });
    } catch (error) {
        console.error("Error occurred while deleting player:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const createTeam = async (req, res) => {
    const { name, shortName, logo, purseRemaining, owner, color } = req.body;
    try {
        if (!name || !shortName || !logo || !purseRemaining || !owner) {
            return res.status(400).json({ message: "Team Data Not Sufficient" });
        }
        if (!mongoose.Types.ObjectId.isValid(owner)) {
            return res.status(400).json({ message: "Invalid Owner ID" });
        }
        const ownerExists = await User.findById(owner);
        if (!ownerExists) {
            return res.status(404).json({ message: "Owner not found" });
        }
        const existsTeam = await Team.find({
            $or: [{ name: name }, { shortName: shortName }],
        });
        if (existsTeam && existsTeam.length > 0) {
            return res.status(400).json({ message: "Please choose another team name" });
        }
        const team = await Team.create({
            name,
            shortName: shortName,
            logo,
            purseRemaining,
            owner: ownerExists._id,
            theme: color,
        });
        return res.status(200).json({ success: true, team });
    } catch (error) {
        console.error("Error occurred while creating team : ", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const deleteTeam = async (req, res) => {
    const { id } = req.params;

    try {
        if (!id) {
            return res.status(400).json({ message: "Team ID not provided" });
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid Team ID" });
        }

        const team = await Team.findById(id).exec();
        if (!team) {
            return res.status(404).json({ success: false, message: "Team not found" });
        }

        if (team.players.length > 0) {
            await Promise.all(
                team.players.map((p) =>
                    Player.findByIdAndUpdate(p.player, { $set: { currentTeam: null, available: "available" } }).exec()
                )
            );
        }

        if (team.currentAuction) {
            return res
                .status(400)
                .json({ success: false, message: "Cannot delete team as it is part of an active auction." });
        }

        await Team.findByIdAndDelete(id).exec();

        return res.status(200).json({ success: true, message: "Team deleted successfully" });
    } catch (error) {
        console.error("Error occurred while deleting team:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
