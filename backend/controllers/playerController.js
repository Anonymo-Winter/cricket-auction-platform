import mongoose from "mongoose";
import Player from "../models/player.models.js";
import Team from "../models/team.models.js";
import Auction from "../models/auction.models.js";
import { analyseRows, IMPORT_LIMIT } from "../utils/playerImport.js";

export const getAllPlayers = async (req, res) => {
    try {
        let { page = 1, limit = 10, status, season, sortBy, sortOrder = "desc" } = req.query;
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

        // Custom stat-based sorting
        const sortOptions = {};
        const order = sortOrder === "asc" ? 1 : -1;

        const sortByMap = {
            "most-runs": "battingStats.runs",
            "highest-score": "battingStats.highest_score",
            "highest-average": "battingStats.average",
            "most-fifties": "battingStats.fifties",
            "most-hundreds": "battingStats.centuries",
            "highest-strike-rate": "battingStats.strike_rate",
            "most-fours": "battingStats.fours",
            "most-sixes": "battingStats.sixes",

            "most-wickets": "bowlingStats.wickets",
            "best-average": "bowlingStats.average",
            "best-bowling-figures": "bowlingStats.best_figures", // e.g., 5/12 stored as 5.12
            "best-economy": "bowlingStats.economy",

            name: "name",
            season: "season",
            status: "status",
            createdAt: "createdAt",
        };

        if (sortBy && sortByMap[sortBy]) {
            sortOptions[sortByMap[sortBy]] = order;
        } else {
            sortOptions.createdAt = -1;
        }

        const skip = (page - 1) * limit;

        const players = await Player.find(query).sort(sortOptions).skip(skip).limit(limit);

        const totalPlayers = await Player.countDocuments(query);

        res.status(200).json({
            success: true,
            data: players,
            pagination: {
                page,
                limit,
                total: totalPlayers,
                totalPages: Math.ceil(totalPlayers / limit),
            },
        });
    } catch (error) {
        console.error("Error while fetching all players data:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getAvailablePlayers = async (req, res) => {
    try {
        const players = await Player.find({
            $or: [{ currentTeam: null }],
        });
        if (players.length === 0) {
            return res.status(200).send(undefined);
        }

        res.status(200).send({ players });
    } catch (error) {
        console.error("Error while fetching available players:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getPlayersId = async (req, res) => {
    const { id } = req.params;
    try {
        if (!id) {
            return res.status(400).json({ success: false, message: "Player ID not provided" });
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid player ID provided" });
        }

        const player = await Player.findById(id).populate("previousTeams.team", "name logo");

        if (!player) {
            return res.status(404).json({ success: false, message: "Player not found" });
        }

        const val = await player.getValueEstimate?.();

        const previousSales = player.previousTeams.map((entry) => ({
            teamName: entry.team?.name || "Unknown",
            season: entry.season,
            price: entry.price,
        }));

        res.status(200).json({
            success: true,
            data: player,
            suggestedBasePrice: val,
            previousSales,
        });
    } catch (error) {
        console.error("Error while fetching player details:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const updatePlayer = async (req, res) => {
    try {
        const { id } = req.params;
        const { updatedData } = req.body;

        const player = await Player.findById(id);
        if (!player) {
            return res.status(404).json({
                success: false,
                message: "Player not found",
            });
        }

        const requiredFields = ["name", "dateOfBirth", "nationality", "role", "battingStyle"];
        const missingFields = requiredFields.filter((field) => !updatedData[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(", ")}`,
            });
        }

        if (new Date(updatedData.dateOfBirth) > new Date()) {
            return res.status(400).json({
                success: false,
                message: "Date of birth cannot be in the future",
            });
        }

        const validRoles = ["batsman", "bowler", "all-rounder", "wicket-keeper", "wicket-keeper-batsman"];
        if (!validRoles.includes(updatedData.role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role specified",
            });
        }

        const numericFields = {
            iplDebut: { min: 2008, max: new Date().getFullYear() },
            matches: { min: 0 },
            basePrice: { values: [2000000, 5000000, 10000000, 15000000, 20000000] },
        };

        for (const [field, rules] of Object.entries(numericFields)) {
            if (updatedData[field] !== undefined) {
                if (rules.min !== undefined && updatedData[field] < rules.min) {
                    return res.status(400).json({
                        success: false,
                        message: `${field} cannot be less than ${rules.min}`,
                    });
                }
                if (rules.max !== undefined && updatedData[field] > rules.max) {
                    return res.status(400).json({
                        success: false,
                        message: `${field} cannot be greater than ${rules.max}`,
                    });
                }
                if (rules.values && !rules.values.includes(Number(updatedData[field]))) {
                    return res.status(400).json({
                        success: false,
                        message: `${field} must be one of: ${rules.values.join(", ")}`,
                    });
                }
            }
        }

        if (updatedData.battingStats) {
            const battingStats = updatedData.battingStats;
            if (
                battingStats.innings < 0 ||
                battingStats.runs < 0 ||
                battingStats.highest_score < 0 ||
                battingStats.fifties < 0 ||
                battingStats.centuries < 0 ||
                battingStats.fours < 0 ||
                battingStats.sixes < 0 ||
                battingStats.notOuts < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Batting statistics cannot be negative",
                });
            }
        }

        if (updatedData.bowlingStats) {
            const bowlingStats = updatedData.bowlingStats;
            if (
                bowlingStats.innings < 0 ||
                bowlingStats.overs < 0 ||
                bowlingStats.wickets < 0 ||
                bowlingStats.economy < 0 ||
                bowlingStats.five_wickets < 0 ||
                bowlingStats.dot_balls < 0 ||
                bowlingStats.runs_conceded < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Bowling statistics cannot be negative",
                });
            }
        }

        // Clean update data to prevent modifying immutable fields
        const protectedFields = ["soldPrice", "currentPrice"];
        protectedFields.forEach((field) => {
            delete updatedData[field];
        });

        // Update player
        const updatedPlayer = await Player.findByIdAndUpdate(id, updatedData, {
            new: true,
            runValidators: true,
        });

        // Pre-save middleware will handle calculated fields (averages, etc.)
        await updatedPlayer.save();

        return res.status(200).json({
            success: true,
            message: "Player updated successfully",
            data: updatedPlayer,
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            const validationErrors = Object.values(error.errors).map((err) => err.message);
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validationErrors,
            });
        }

        console.error("Error updating player:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

export const deletePlayer = async (req, res) => {
    const { id } = req.params;
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid player ID" });
        }

        const player = await Player.findById(id);
        if (!player) {
            return res.status(404).json({ success: false, message: "Player not found" });
        }

        if (player.currentTeam) {
            await Team.findByIdAndUpdate(player.currentTeam, {
                $pull: { players: { player: id } },
                $inc: {
                    currentSquadSize: -1,
                    ...(player.nationality !== "Indian" && { overseasCount: -1 }),
                },
            });
        }

        if (player.currentAuction) {
            await Auction.findByIdAndUpdate(player.currentAuction, {
                $pull: {
                    players: { player: id },
                    bids: { player: id },
                    results: { player: id },
                },
            });
        }

        await Player.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: "Player deleted successfully" });
    } catch (error) {
        console.error("Error occurred while deleting player:", error.stack);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const createPlayer = async (req, res) => {
    try {
        const {
            name,
            dateOfBirth,
            nationality,
            image,
            role,
            battingStyle,
            bowlingStyle,
            iplDebut,
            matches,
            basePrice,
            isUncapped,
            internationalCaps,
            availability,
            battingStats,
            bowlingStats,
        } = req.body;

        if (!name || !dateOfBirth || !nationality || !role || !battingStyle || !basePrice) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields",
            });
        }

        const dob = new Date(dateOfBirth);
        if (dob > new Date()) {
            return res.status(400).json({
                success: false,
                message: "Date of birth cannot be in the future",
            });
        }

        const currentYear = new Date().getFullYear();
        if (iplDebut < 2008 || iplDebut > currentYear) {
            return res.status(400).json({
                success: false,
                message: "Invalid IPL debut year",
            });
        }

        if (basePrice < 2000000) {
            // Minimum 20 Lakhs
            return res.status(400).json({
                success: false,
                message: "Base price must be at least 20 Lakhs",
            });
        }

        if (role === "bowler" && bowlingStyle === "none") {
            return res.status(400).json({
                success: false,
                message: "Bowlers must have a bowling style specified",
            });
        }

        if (isUncapped && (internationalCaps.tests > 0 || internationalCaps.odis > 0 || internationalCaps.t20is > 0)) {
            return res.status(400).json({
                success: false,
                message: "Uncapped players cannot have international caps",
            });
        }

        const newPlayer = new Player({
            name,
            dateOfBirth,
            nationality,
            image: image || "default-player.png",
            role,
            battingStyle,
            bowlingStyle: bowlingStyle || "none",
            iplDebut,
            matches: matches || 0,
            basePrice,
            currentPrice: basePrice,
            status: "available",
            isUncapped,
            internationalCaps: {
                tests: internationalCaps?.tests || 0,
                odis: internationalCaps?.odis || 0,
                t20is: internationalCaps?.t20is || 0,
            },
            availability,
            battingStats: {
                innings: battingStats?.innings || 0,
                runs: battingStats?.runs || 0,
                average: battingStats?.average || 0,
                strike_rate: battingStats?.strike_rate || 0,
                highest_score: battingStats?.highest_score || 0,
                fifties: battingStats?.fifties || 0,
                centuries: battingStats?.centuries || 0,
                fours: battingStats?.fours || 0,
                sixes: battingStats?.sixes || 0,
                notOuts: battingStats?.notOuts || 0,
            },
            bowlingStats: {
                innings: bowlingStats?.innings || 0,
                overs: bowlingStats?.overs || 0,
                wickets: bowlingStats?.wickets || 0,
                economy: bowlingStats?.economy || 0,
                average: bowlingStats?.average || 0,
                best_figures: {
                    wickets: bowlingStats?.best_figures?.wickets || 0,
                    runs: bowlingStats?.best_figures?.runs || 0,
                },
                five_wickets: bowlingStats?.five_wickets || 0,
                dot_balls: bowlingStats?.dot_balls || 0,
                runs_conceded: bowlingStats?.runs_conceded || 0,
            },
        });

        const savedPlayer = await newPlayer.save();

        res.status(201).json({
            success: true,
            message: "Player created successfully",
            player: savedPlayer,
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            const validationErrors = Object.values(error.errors).map((err) => err.message);
            return res.status(400).json({
                success: false,
                message: "Validation Error",
                errors: validationErrors,
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "A player with this name already exists",
            });
        }

        console.error("Error creating player:", error);

        res.status(500).json({
            success: false,
            message: "An error occurred while creating the player",
        });
    }
};

// Bulk-create players from CSV rows. With dryRun: true nothing is saved and every row's outcome is returned,
// so the admin can fix problems first. Rows that are invalid or already exist are skipped, never half-saved.
export const importPlayers = async (req, res) => {
    try {
        const { rows, dryRun = false } = req.body;
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ success: false, message: "No rows to import" });
        }
        if (rows.length > IMPORT_LIMIT) {
            return res.status(400).json({
                success: false,
                message: `Import at most ${IMPORT_LIMIT} players at a time (this file has ${rows.length})`,
            });
        }

        const results = await analyseRows(rows);
        const summary = {
            total: results.length,
            valid: results.filter((r) => r.status === "valid").length,
            duplicate: results.filter((r) => r.status === "duplicate").length,
            invalid: results.filter((r) => r.status === "invalid").length,
        };

        let created = 0;
        if (!dryRun && summary.valid > 0) {
            const inserted = await Player.insertMany(
                results.filter((r) => r.status === "valid").map((r) => r.doc),
                { ordered: false }
            );
            created = inserted.length;
        }

        return res.status(200).json({
            success: true,
            dryRun: !!dryRun,
            summary,
            created,
            rows: results.map(({ doc:_doc, ...rest }) => rest),
        });
    } catch (error) {
        console.error("Error importing players:", error);
        return res.status(500).json({ success: false, message: "Could not import players" });
    }
};
