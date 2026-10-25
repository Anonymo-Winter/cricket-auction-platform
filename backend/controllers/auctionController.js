import Auction from "../models/auction.models.js";
import Player from "../models/player.models.js";
import User from "../models/user.models.js";
import Team from "../models/team.models.js";
import mongoose from "mongoose";
import AuctionHistory from "../models/auctionHistory.models.js";
import { canControlAuction } from "../utils/socketAuth.js";
import { resolveSettings, hasTimezone } from "../utils/auctionRules.js";
import { completeAuction } from "../services/auctionCompletion.js";
import { teamsSummary, buildSquads, squadsToCsv } from "../services/auctionReports.js";

// Auctions in any of these states are unfinished: a team may only be in one of them at a time
const UNFINISHED_STATUSES = ["scheduled", "active", "paused", "waiting"];

export const getAllAuctionsData = async (req, res) => {
    try {
        let { page = 1, limit = 10, status, season, sortBy, sortOrder = "asc" } = req.query;
        page = Math.max(1, parseInt(page));
        limit = Math.max(1, parseInt(limit));

        const query = {};

        if (status && status !== "all") {
            if (status === "ongoing") {
                query.status = { $in: ["waiting", "active"] };
            } else {
                query.status = status;
            }
        }

        if (season && season !== "all") query.season = parseInt(season);

        const sortOptions = {};
        if (sortBy) {
            if (sortBy === "name" || sortBy === "name_desc") {
                sortOptions.name = sortOrder === "desc" ? -1 : 1;
            } else if (sortBy === "season") {
                sortOptions.season = sortOrder === "desc" ? -1 : 1;
            } else if (sortBy === "status") {
                sortOptions.status = sortOrder === "desc" ? -1 : 1;
            } else if (sortBy === "createdAt") {
                sortOptions.createdAt = sortOrder === "desc" ? -1 : 1;
            }
        } else {
            sortOptions.createdAt = -1;
        }

        const skip = (page - 1) * limit;

        const auctions = await Auction.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .populate("players.player")
            .populate("teams.team")
            .populate("currentPlayer")
            .exec();

        const totalAuctions = await Auction.countDocuments(query);

        res.status(200).json({
            success: true,
            data: auctions,
            pagination: {
                page,
                limit,
                total: totalAuctions,
                totalPages: Math.ceil(totalAuctions / limit),
            },
        });
    } catch (error) {
        console.error("Error while fetching all auctions data:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getAuctionsById = async (req, res) => {
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
                message: "Invalid auction ID ",
            });
        }

        const auction = await Auction.findById(id)
            .populate("players.player")
            .populate("teams.team")
            .populate("currentPlayer")
            .exec();

        if (!auction) {
            return res.status(404).json({
                success: false,
                message: "Auction not found",
            });
        }

        res.status(200).send(auction);
    } catch (error) {
        console.error("Error occurred while fetching auction by ID:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const markPlayersToSets = async (req, res) => {
    const { playersData: players, auctionId } = req.body;
    try {
        if (!auctionId) {
            return res.status(400).json({ error: "Auction Id Not Provided" });
        }
        if (!players || players.length === 0) {
            return res.status(400).json({ error: "Empty request body" });
        }

        const auction = await Auction.findById(auctionId);
        if (!auction) {
            return res.status(404).json({ error: "Auction not found" });
        }

        players.forEach(({ id, set }) => {
            let player = auction.players.find((p) => {
                if (typeof p.player === "object") {
                    return p.player.equals(new mongoose.Types.ObjectId(id));
                }
                return p.player.toString() === id;
            });

            if (player) {
                player.set = set;
            }
        });

        await auction.save();
        return res.status(200).json({ message: "Players marked successfully" });
    } catch (error) {
        console.error("Error saving players set:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const updateAuction = async (req, res) => {
    const { updatedData, id } = req.body;
    try {
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Auction Id Not Provided" });
        }
        if (!updatedData || typeof updatedData !== "object" || Object.keys(updatedData).length === 0) {
            return res.status(400).json({ message: "Empty Updated Data" });
        }

        const auction = await Auction.findById(id);
        if (!auction) {
            return res.status(404).json({ message: "Auction not found" });
        }

        const editable = ["scheduled", "cancelled"].includes(auction.status);

        // An auction opens at its start time and then runs on its own clock, so nobody sets "active", "paused"
        // or "completed" by hand. An admin can only cancel a scheduled auction or put a cancelled one back.
        if (updatedData.status && updatedData.status !== auction.status) {
            if (!(editable && ["scheduled", "cancelled"].includes(updatedData.status))) {
                return res.status(400).json({
                    message:
                        "Status can't be set by hand: an auction opens at its start time and is then run by its auctioneer. You can only cancel a scheduled auction or reschedule a cancelled one.",
                });
            }
        }

        for (const key of ["startTime", "endTime"]) {
            if (updatedData[key] && !hasTimezone(updatedData[key])) {
                return res.status(400).json({
                    message: "Times must include a timezone, e.g. 2026-10-22T18:00:00+05:30 or 2026-10-22T12:30:00Z",
                });
            }
        }

        const startTime = updatedData.startTime ? new Date(updatedData.startTime) : auction.startTime;
        const endTime = updatedData.endTime ? new Date(updatedData.endTime) : auction.endTime;
        if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
            return res.status(400).json({ message: "Invalid start or end time" });
        }
        if (endTime <= startTime) {
            return res.status(400).json({ message: "End time must be after start time" });
        }

        const { settings, error: settingsError } = resolveSettings(updatedData, auction.settings?.toObject?.() ?? auction.settings);
        if (settingsError) {
            return res.status(400).json({ message: settingsError });
        }

        const timesChanged =
            startTime.getTime() !== new Date(auction.startTime).getTime() ||
            endTime.getTime() !== new Date(auction.endTime).getTime();
        const settingsChanged = Object.keys(settings).some((key) => settings[key] !== auction.settings?.[key]);

        // Once an auction has opened its schedule and rules are fixed (only the name can still change)
        if (!editable && (timesChanged || settingsChanged)) {
            return res.status(400).json({
                message: "Times and rules can't be changed once the auction has opened. Only the name can be edited.",
            });
        }

        const resultingStatus = updatedData.status || auction.status;
        if (resultingStatus === "scheduled" && (timesChanged || auction.status === "cancelled") && startTime <= new Date()) {
            return res.status(400).json({ message: "Choose a start time in the future" });
        }

        const $set = { name: updatedData.name?.trim() || auction.name };
        if (editable) {
            Object.assign($set, { status: resultingStatus, startTime, endTime });
            for (const [key, value] of Object.entries(settings)) $set[`settings.${key}`] = value;
        }
        await Auction.updateOne({ _id: id }, { $set });

        // Copies of the schedule live on the assigned auctioneer and on registered teams: keep them in step
        if (editable && timesChanged) {
            const arrayFilters = [{ "a.auctionId": auction._id }];
            await User.updateMany(
                { "assignedAuctions.auctionId": auction._id },
                { $set: { "assignedAuctions.$[a].startTime": startTime, "assignedAuctions.$[a].endTime": endTime } },
                { arrayFilters }
            );
            await Team.updateMany(
                { "registeredAuction.auctionId": auction._id },
                { $set: { "registeredAuction.$[a].startTime": startTime, "registeredAuction.$[a].endTime": endTime } },
                { arrayFilters }
            );
        }
        return res.status(200).json({ message: "Auction Details Updated Successfully!" });
    } catch (error) {
        console.error("Error updating auction details:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getAvailablePlayers = async (req, res) => {
    const id = req.params.id;
    try {
        if (!id) {
            return res.status(400).json({ message: "Auction Id Not Provided" });
        }

        const availablePlayers = await Player.find({
            currentAuction: null,
            currentTeam: null,
        });

        if (availablePlayers.length === 0) {
            return res.status(400).json({ message: "No available players are currently available for this auction" });
        }

        return res.status(200).send(availablePlayers);
    } catch (error) {
        console.error("Error occurred while fetching available players:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getAllTeams = async (req, res) => {
    try {
        let { page = 1, limit = 10, sortBy, sortOrder = "asc" } = req.query;

        page = Math.max(1, parseInt(page));
        limit = Math.max(1, parseInt(limit));

        const sortOptions = {};
        if (sortBy) {
            if (sortBy === "name") {
                sortOptions.name = sortOrder === "desc" ? -1 : 1;
            } else if (sortBy === "createdAt") {
                sortOptions.createdAt = sortOrder === "desc" ? -1 : 1;
            }
        } else {
            sortOptions.createdAt = -1; // Default: newest first
        }

        const skip = (page - 1) * limit;

        const teams = await Team.find({}).sort(sortOptions).skip(skip).limit(limit).exec();

        const totalTeams = await Team.countDocuments();

        res.status(200).json({
            success: true,
            data: teams,
            pagination: {
                page,
                limit,
                total: totalTeams,
                totalPages: Math.ceil(totalTeams / limit),
            },
        });
    } catch (error) {
        console.error("Error while fetching all Teams data:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getAllAvailableTeams = async (req, res) => {
    const { auctionId } = req.params;

    try {
        if (!auctionId) {
            return res.status(400).json({
                success: false,
                message: "Auction Id Not Provided",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(auctionId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Auction Id Provided",
            });
        }

        // A team can only be in one unfinished auction at a time, so teams already in another one aren't offered
        const busyElsewhere = await Auction.find({
            _id: { $ne: auctionId },
            status: { $in: UNFINISHED_STATUSES },
        }).select("teams.team");
        const busyTeamIds = new Set(busyElsewhere.flatMap((a) => a.teams.map((t) => t.team.toString())));

        const allTeams = await Team.find({});

        const availableTeams = allTeams.filter((team) => {
            if (busyTeamIds.has(team._id.toString())) return false;
            return !team.registeredAuction.some((entry) => entry.auctionId.toString() === auctionId);
        });

        return res.status(200).json({
            success: true,
            data: availableTeams,
        });
    } catch (error) {
        console.error("Error while fetching available teams:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const addPlayersToAuction = async (req, res) => {
    const { players } = req.body;
    const { id } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid auction ID format",
            });
        }

        if (!players || !Array.isArray(players) || players.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid or empty player data provided",
            });
        }

        const invalidIds = players.filter((playerId) => !mongoose.Types.ObjectId.isValid(playerId));
        if (invalidIds.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid player ID format found",
                invalidPlayers: invalidIds,
            });
        }

        const auction = await Auction.findById(id);
        if (!auction) {
            return res.status(404).json({
                success: false,
                message: "Auction not found",
            });
        }

        // Ensure players can only be added to scheduled auctions
        if (auction.status !== "scheduled") {
            return res.status(400).json({
                success: false,
                message: "Players can only be added to upcoming auctions",
            });
        }

        const existingPlayers = await Player.find({ _id: { $in: players } });
        if (existingPlayers.length !== players.length) {
            const missingPlayers = players.filter(
                (playerId) => !existingPlayers.some((player) => player._id.toString() === playerId)
            );
            return res.status(400).json({
                success: false,
                message: "Some players were not found in the database",
                missingPlayers,
            });
        }

        const playersInOtherAuctions = await Player.find({
            _id: { $in: players },
            currentAuction: { $exists: true, $ne: null },
        });

        if (playersInOtherAuctions.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Some players are already part of another auction",
                players: playersInOtherAuctions.map((p) => p.name),
            });
        }

        const formattedPlayers = players.map((playerId, index) => ({
            player: new mongoose.Types.ObjectId(playerId),
            status: "pending",
            order: auction.players.length + index + 1,
            set: "accelerated",
        }));

        const updatedAuction = await Auction.findByIdAndUpdate(
            id,
            { $push: { players: { $each: formattedPlayers } } },
            { new: true }
        )
            .populate("players.player")
            .populate("teams.team")
            .populate("currentPlayer")
            .exec();

        await Player.updateMany(
            { _id: { $in: players } },
            { $set: { currentAuction: new mongoose.Types.ObjectId(id), status: "available" } }
        );

        return res.status(200).json({
            success: true,
            message: "Players added to auction successfully",
            auction: updatedAuction,
        });
    } catch (error) {
        console.error("Error while adding players to auction:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

export const addTeamsToAuction = async (req, res) => {
    const { teams } = req.body;
    const { id } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid auction ID format",
            });
        }

        if (!teams || !Array.isArray(teams) || teams.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid or empty team data provided",
            });
        }

        const invalidIds = teams.filter((teamId) => !mongoose.Types.ObjectId.isValid(teamId));
        if (invalidIds.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid team ID format found",
                invalidTeams: invalidIds,
            });
        }

        const auction = await Auction.findById(id);
        if (!auction) {
            return res.status(404).json({
                success: false,
                message: "Auction not found",
            });
        }

        if (auction.status !== "scheduled") {
            return res.status(400).json({
                success: false,
                message: "Teams can only be added to upcoming auctions",
            });
        }

        const busyIn = await Auction.find({
            _id: { $ne: id },
            status: { $in: UNFINISHED_STATUSES },
            "teams.team": { $in: teams },
        }).select("name teams.team");
        if (busyIn.length > 0) {
            const busyTeamIds = new Set(busyIn.flatMap((a) => a.teams.map((t) => t.team.toString())));
            const busyTeams = await Team.find({ _id: { $in: teams.filter((t) => busyTeamIds.has(String(t))) } }).select("name");
            return res.status(409).json({
                success: false,
                message: `These teams are already in another unfinished auction: ${busyTeams
                    .map((t) => t.name)
                    .join(", ")}. A team can only be in one auction at a time.`,
            });
        }

        const existingTeams = await Team.find({ _id: { $in: teams } });

        if (existingTeams.length !== teams.length) {
            const missingTeams = teams.filter(
                (teamId) => !existingTeams.some((team) => team._id.toString() === teamId)
            );
            return res.status(400).json({
                success: false,
                message: "Some teams were not found in the database",
                missingTeams,
            });
        }

        const alreadyRegistered = [];

        for (const team of existingTeams) {
            const alreadyInAuction = team.registeredAuction.some((entry) => entry.auctionId.toString() === id);

            if (alreadyInAuction) {
                alreadyRegistered.push(team.name);
                continue;
            }

            const purse = auction?.settings?.maxPursePerTeam || 10000000;

            team.registeredAuction.push({
                auctionId: id,
                purseRemaining: purse,
                startTime: auction.startTime,
                endTime: auction.endTime,
            });

            await team.save();

            auction.teams.push({
                team: team._id,
                purseRemaining: purse,
                playersAcquired: team.currentSquadSize || 0,
                isActive: true,
            });
        }

        await auction.save();
        const updatedAuction = await Auction.findById(id).populate("teams.team");

        return res.status(200).json({
            success: true,
            message: "Teams added to auction successfully",
            auction: updatedAuction,
        });
    } catch (error) {
        console.error("Error while adding teams to auction:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

export const deleteTeamsFromAuction = async (req, res) => {
    try {
        const { id } = req.params;
        const { teamId } = req.body;

        if (!id || !teamId) {
            return res.status(400).json({ message: "Auction ID and Team ID are required" });
        }

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(teamId)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        const auction = await Auction.findById(id);
        if (!auction) {
            return res.status(404).json({ message: "Auction not found" });
        }

        if (auction.status !== "scheduled") {
            return res.status(400).json({
                message: "Teams can only be removed from upcoming/scheduled auctions",
            });
        }

        const updatedAuction = await Auction.findByIdAndUpdate(
            id,
            { $pull: { teams: { team: teamId } } },
            { new: true }
        )
            .populate("players.player")
            .populate("teams.team")
            .populate("currentPlayer")
            .exec();

        if (!updatedAuction) {
            return res.status(404).json({ message: "Auction not found after update" });
        }

        team.registeredAuction = team.registeredAuction.filter((entry) => entry.auctionId.toString() !== id);
        await team.save();

        await Team.findByIdAndUpdate(teamId, { $unset: { currentAuction: "" } });

        return res.status(200).json({
            message: "Team removed successfully from auction",
            auction: updatedAuction,
        });
    } catch (error) {
        console.error("Error removing team from auction:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const deletePlayerFromAuction = async (req, res) => {
    try {
        const { id } = req.params;
        const { playerId } = req.body;
        if (!id || !playerId) {
            return res.status(400).json({ message: "Auction ID and Team ID are required" });
        }
        const player = await Player.findById(playerId);

        if (!player) {
            return res.status(404).json({ message: "Player not found" });
        }

        const auction = await Auction.findById(id);

        if (!auction) {
            return res.status(404).json({ message: "Auction not found" });
        }

        if (auction.status !== "scheduled") {
            return res.status(400).json({ message: "Teams can only be removed from upcoming/scheduled auctions" });
        }

        const updatedAuction = await Auction.findByIdAndUpdate(
            id,
            { $pull: { players: { player: playerId } } },
            { new: true }
        )
            .populate("players.player")
            .populate("teams.team")
            .populate("currentPlayer")
            .exec();

        if (!updatedAuction) {
            return res.status(404).json({ message: "Auction not found after update" });
        }

        await Player.findByIdAndUpdate(playerId, { $unset: { currentAuction: "" } });

        return res.status(200).json({ message: "Player removed successfully", auction: updatedAuction });
    } catch (error) {
        console.error("Error removing team from auction:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getAllAvailableAuctions = async (req, res) => {
    try {
        const auctions = await Auction.find({ auctioneer: null })
            .populate({
                path: "players.player",
                select: "name team role",
            })
            .populate({
                path: "teams.team",
                select: "name logo",
            })
            .populate({
                path: "currentPlayer",
                select: "name position",
            })
            .sort({ startTime: 1 })
            .lean();

        res.status(200).json({
            success: true,
            data: auctions,
        });
    } catch (error) {
        console.error("Error while fetching all available auctions:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

export const getSummaryStats = async (req, res) => {
    try {
        const players = await Player.find({});
        const teams = await Team.find({});
        const auctions = await Auction.find({});
        const users = await User.find({});
        const userroles = users.filter((p) => p.role === "user");
        const auctioneerRole = users.filter((p) => p.role === "auctioneer");
        const ongoingAuctions = auctions.filter((auction) => auction.status === "active");
        const completedAuctions = auctions.filter((auction) => auction.status === "completed");

        return res.status(200).send({
            players: players.length,
            teams: teams.length,
            auctions: auctions.length,
            auctioneers: auctioneerRole.length,
            users: userroles.length,
            ongoingAuctions: ongoingAuctions.length,
            completedAuctions: completedAuctions.length,
        });
    } catch (error) {
        console.error("Error fetching auction summary:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
    return res.status(200).json({ message: "Slow" });
};

export const createNewAuction = async (req, res) => {
    try {
        const { name, season, startTime, endTime, settings, auctioneer, players, teams } = req.body;

        if (!name || !season || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields: name, season, startTime, endTime",
            });
        }

        if (!hasTimezone(startTime) || !hasTimezone(endTime)) {
            return res.status(400).json({
                success: false,
                message: "Times must include a timezone, e.g. 2026-10-22T18:00:00+05:30 or 2026-10-22T12:30:00Z",
            });
        }

        if (new Date(endTime) <= new Date(startTime)) {
            return res.status(400).json({
                success: false,
                message: "End time must be after start time",
            });
        }

        // Auctions open by themselves at their start time, so it has to be a time that hasn't passed
        if (new Date(startTime) <= new Date()) {
            return res.status(400).json({
                success: false,
                message: "Start time must be in the future",
            });
        }

        const { settings: validSettings, error: settingsError } = resolveSettings(settings);
        if (settingsError) {
            return res.status(400).json({ success: false, message: settingsError });
        }

        const newAuction = new Auction({
            name,
            season,
            startTime,
            endTime,
            status: "scheduled",
            settings: validSettings,
        });

        if (auctioneer) {
            newAuction.auctioneer = auctioneer;
        }

        if (players && Array.isArray(players)) {
            newAuction.players = players.map((player, index) => ({
                player: player.playerId,
                status: "pending",
                order: index + 1,
                set: player.set || "uncapped",
            }));
        }

        if (teams && Array.isArray(teams)) {
            const maxPurse = validSettings.maxPursePerTeam;
            newAuction.teams = teams.map((teamId) => ({
                team: teamId,
                purseRemaining: maxPurse,
                playersAcquired: 0,
                isActive: true,
            }));
        }

        newAuction.logs = [
            {
                action: "start",
                details: {
                    createdBy: req.user?._id || "system",
                },
                timestamp: new Date(),
            },
        ];

        await newAuction.save();

        res.status(201).json({
            success: true,
            message: "Auction created successfully",
            data: newAuction,
        });
    } catch (error) {
        console.error("Error creating auction:", error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "An auction with this name already exists",
            });
        }

        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((val) => val.message);
            return res.status(400).json({
                success: false,
                message: messages.join(", "),
            });
        }

        res.status(500).json({
            success: false,
            message: "Server error while creating auction",
            error: error.message,
        });
    }
};

export const deleteAuction = async (req, res) => {
    const { id: auctionId } = req.params;

    try {
        if (!auctionId) {
            return res.status(400).json({ message: "Auction ID is required" });
        }

        if (!mongoose.Types.ObjectId.isValid(auctionId)) {
            return res.status(400).json({ success: false, message: "Invalid auction ID format" });
        }

        const auction = await Auction.findById(auctionId).populate("teams.team");
        if (!auction) {
            return res.status(404).json({ success: false, message: "Auction not found" });
        }

        if (auction.status === "active" || auction.status === "paused") {
            return res.status(400).json({ success: false, message: "Cannot delete an active or ongoing auction" });
        }

        if (auction.auctioneer) {
            await User.updateOne(
                { _id: auction.auctioneer, role: "auctioneer" },
                { $pull: { assignedAuctions: { auctionId } } }
            );
        }

        const teamIds = auction.teams.map((t) => t.team._id || t.team); // Handle both populated and unpopulated
        await Team.updateMany({ _id: { $in: teamIds } }, { $set: { currentAuction: null } });

        await Player.updateMany({ currentAuction: auctionId }, { $set: { currentAuction: null } });

        await Auction.findByIdAndDelete(auctionId);

        return res.status(200).json({
            success: true,
            message: "Auction successfully deleted",
        });
    } catch (error) {
        console.error("Error deleting auction:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while deleting auction",
            error: error.message,
        });
    }
};

export const getAssignedAuctions = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        if (user.role !== "auctioneer") {
            return res.status(403).json({
                success: false,
                message: "Only auctioneers can access their assigned auctions",
            });
        }

        const populatedUser = await User.findById(id)
            .populate({
                path: "assignedAuctions.auctionId",
                select: "name status startTime endTime season currentRound",
            })
            .select("assignedAuctions");

        const formattedAuctions = populatedUser.assignedAuctions.map((item) => {
            const { _id, name, status, season, currentRound } = item.auctionId;

            const startTime = item.auctionId.startTime || item.startTime;
            const endTime = item.auctionId.endTime || item.endTime;

            return {
                assignmentId: item._id,
                auctionId: _id,
                name,
                status,
                season,
                currentRound,
                startTime,
                endTime,
            };
        });

        return res.status(200).json(formattedAuctions);
    } catch (error) {
        console.error("Error fetching assigned auctions:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching assigned auctions",
            error: error.message,
        });
    }
};

// Resumes a paused (or waiting) auction. Admins, or the auctioneer assigned to it. There is deliberately no way to
// start a scheduled auction early: it opens by itself at its start time.
export const startAuction = async (req, res) => {
    const { id } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid auction ID" });
        }

        const auction = await Auction.findById(id);
        if (!auction) {
            return res.status(404).json({ success: false, message: "Auction not found" });
        }

        if (!canControlAuction(req.user, auction)) {
            return res.status(403).json({
                success: false,
                message: "Only the assigned auctioneer can start this auction",
            });
        }

        if (auction.status === "scheduled") {
            return res.status(400).json({
                success: false,
                message: "An auction opens automatically at its start time and can't be started early.",
            });
        }
        if (!["waiting", "paused"].includes(auction.status)) {
            return res.status(400).json({
                success: false,
                message: "Only a paused or waiting auction can be resumed",
            });
        }

        if (auction.status === "paused") {
            await auction.resumeAuction();
        } else {
            // Out of players earlier; carry on with whoever was put back to pending
            const nextPlayer = auction.players.find((p) => p.status === "pending");
            if (!nextPlayer) {
                return res.status(400).json({
                    success: false,
                    message: "No pending players left to auction",
                });
            }

            auction.currentPlayer = nextPlayer.player;
            nextPlayer.status = "current";
            auction.currentBid = null;
            auction.status = "active";
            auction.timeRemaining = new Date(Date.now() + auction.settings.bidTimeLimit * 1000);
            auction.logs.push({
                action: "resume",
                details: { player: nextPlayer.player },
                timestamp: new Date(),
            });
            await auction.save();
        }

        // Start the server-side clock and tell everyone who is watching
        const runtime = req.app.get("auctionRuntime");
        runtime?.arm(id);
        await runtime?.broadcast(id);

        const populatedAuction = await Auction.findById(id)
            .populate("players.player")
            .populate("results.player", "name nationality image basePrice role")
            .populate("results.soldTo", "logo name shortName")
            .populate("bids.player")
            .populate("bids.team")
            .exec();

        return res.status(200).json({
            success: true,
            message: "Auction resumed successfully",
            data: populatedAuction,
        });
    } catch (error) {
        console.error("Error occurred while starting the auction:", error);
        return res.status(500).json({
            success: false,
            message: "Error starting auction",
            error: error.message,
        });
    }
};

export const stopAuction = async (req, res) => {
    const { id } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid auction ID" });
        }

        const auction = await Auction.findById(id);
        if (!auction) {
            return res.status(404).json({ success: false, message: "Auction not found" });
        }

        if (auction.status !== "active") {
            return res.status(400).json({
                success: false,
                message: "Cannot stop an auction that is not active",
            });
        }

        if (!canControlAuction(req.user, auction)) {
            return res.status(403).json({
                success: false,
                message: "Only the assigned auctioneer can stop this auction",
            });
        }

        // Freezes the current player's remaining time; the server clock must stop too
        await auction.pauseAuction();
        const runtime = req.app.get("auctionRuntime");
        runtime?.disarm(id);
        await runtime?.broadcast(id);

        return res.status(200).json({
            success: true,
            message: "Auction paused successfully",
            data: auction,
        });
    } catch (error) {
        console.error("Error occurred while stopping the auction:", error);
        return res.status(500).json({
            success: false,
            message: "Error stopping auction",
            error: error.message,
        });
    }
};

export const completedAuction = async (req, res) => {
    const { id } = req.params;

    try {
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Auction ID is required",
            });
        }

        const auction = await Auction.findById(id).select("status auctioneer");
        if (!auction) {
            return res.status(404).json({ success: false, message: "Auction not found" });
        }

        // Admins or the assigned auctioneer only
        if (!canControlAuction(req.user, auction)) {
            return res.status(403).json({
                success: false,
                message: "Only an admin or the assigned auctioneer can complete this auction.",
            });
        }

        const result = await completeAuction(id);
        if (result.error) {
            return res.status(result.status).json({ success: false, message: result.error });
        }

        const runtime = req.app.get("auctionRuntime");
        runtime?.disarm(id);
        await runtime?.broadcast(id);

        return res.status(200).json({
            success: true,
            message: "Auction completed and archived successfully",
            data: result.auctionHistory,
        });
    } catch (error) {
        console.error("Error completing auction:", error);
        return res.status(500).json({
            success: false,
            message: "Error completing auction",
            error: error.message,
        });
    }
};

export const fetchAuctionHistory = async (req, res) => {
    const { id } = req.params;
    try {
        if (!id) {
            return res.status(400).json({ success: false, message: "Auction Id is required." });
        }
        const auction = await AuctionHistory.findById(id)
            .populate({
                path: "teams.team",
                select: "name owner",
            })
            .populate({
                path: "teams.players.player",
                select: "name nationality role",
            })
            .populate({
                path: "players.player",
                select: "name nationality role",
            })
            .populate({
                path: "players.soldTo",
                select: "name",
            })
            .populate({
                path: "logs.player",
                select: "name nationality",
            })
            .populate({
                path: "logs.team",
                select: "name",
            });

        if (!auction) {
            return res.status(404).json({ success: false, message: "Auction Not Found" });
        }

        return res.status(200).json({ success: true, auction });
    } catch (error) {
        console.error("Error fetching auction history:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching auction history",
            error: error.message,
        });
    }
};

export const registerToAuction = async (req, res) => {
    const { auctionId, teamId } = req.body;

    try {
        if (!auctionId || !teamId) {
            return res.status(400).json({ success: false, message: "Auction Id and Team Id is required." });
        }
        if (!mongoose.Types.ObjectId.isValid(auctionId) || !mongoose.Types.ObjectId.isValid(teamId)) {
            return res.status(400).json({ success: false, message: "Invalid auction Id or Team Id format." });
        }

        const auction = await Auction.findById(auctionId);
        if (!auction) {
            return res.status(404).json({ success: false, message: "Auction Not Found" });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ success: false, message: "Team Not Found" });
        }

        const alreadyRegistered = team.registeredAuction.some((entry) => entry.auctionId.toString() === auctionId);
        if (alreadyRegistered) {
            return res.status(400).json({ success: false, message: "Team already registered to this auction." });
        }

        // A team can only be in one unfinished auction at a time; it may join another once that one is completed
        const conflict = await Auction.findOne({
            _id: { $ne: auctionId },
            status: { $in: UNFINISHED_STATUSES },
            "teams.team": teamId,
        }).select("name status");
        if (conflict) {
            return res.status(409).json({
                success: false,
                message: `Your team is already in "${conflict.name}" (${conflict.status}). You can join another auction once it is completed.`,
            });
        }

        const purse = auction?.settings?.maxPursePerTeam || 10000000;

        // Update Team Model
        team.registeredAuction.push({
            auctionId,
            purseRemaining: purse,
            startTime: auction.startTime,
            endTime: auction.endTime,
        });
        await team.save();

        // Update Auction Model
        const alreadyInAuction = auction.teams.some((t) => t.team.toString() === teamId);
        if (!alreadyInAuction) {
            auction.teams.push({
                team: team._id,
                purseRemaining: purse,
                playersAcquired: team.currentSquadSize || 0,
                isActive: true,
            });
            await auction.save();
        }

        return res.status(200).json({ success: true, message: "Registration Successful" });
    } catch (error) {
        console.error("Error occurred while registering team to auction:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to register team to auction",
            error: error.message,
        });
    }
};

// ---- read-only reports (public: the same results are shown to everyone on the live and history pages)

export const getAuctionTeamsSummary = async (req, res) => {
    try {
        const teams = await teamsSummary(req.params.id);
        if (!teams) return res.status(404).json({ success: false, message: "Auction not found" });
        return res.status(200).json({ success: true, teams });
    } catch (error) {
        console.error("Error building teams summary:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getAuctionSquads = async (req, res) => {
    try {
        const squads = await buildSquads(req.params.id);
        if (!squads) return res.status(404).json({ success: false, message: "Auction not found" });
        return res.status(200).json({ success: true, ...squads });
    } catch (error) {
        console.error("Error building squads:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const exportAuctionSquadsCsv = async (req, res) => {
    try {
        const squads = await buildSquads(req.params.id);
        if (!squads) return res.status(404).json({ success: false, message: "Auction not found" });

        const filename = `${squads.auction.name}`.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "auction";
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}-squads.csv"`);
        return res.status(200).send("\uFEFF" + squadsToCsv(squads));
    } catch (error) {
        console.error("Error exporting squads:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
