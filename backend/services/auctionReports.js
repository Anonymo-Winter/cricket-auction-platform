import mongoose from "mongoose";
import Auction from "../models/auction.models.js";
import Team from "../models/team.models.js";

const isOverseas = (player) => !!player?.nationality && player.nationality.trim().toLowerCase() !== "indian";

// Lightweight team info + purse for one auction (used by the big-screen page)
export const teamsSummary = async (auctionId) => {
    if (!mongoose.Types.ObjectId.isValid(auctionId)) return null;
    const auction = await Auction.findById(auctionId).select("teams").lean();
    if (!auction) return null;

    const teams = await Team.find({ _id: { $in: auction.teams.map((t) => t.team) } })
        .select("name shortName logo theme")
        .lean();
    const byId = new Map(teams.map((t) => [String(t._id), t]));

    return auction.teams.map((entry) => {
        const team = byId.get(String(entry.team)) || {};
        return {
            teamId: String(entry.team),
            name: team.name || "Unknown team",
            shortName: team.shortName || "",
            logo: team.logo || "",
            theme: team.theme || "",
            purseRemaining: entry.purseRemaining,
            playersAcquired: entry.playersAcquired,
            isActive: entry.isActive,
        };
    });
};

// Everyone's squad as it stands in one auction: who bought whom, for how much, and what is left in the purse
export const buildSquads = async (auctionId) => {
    if (!mongoose.Types.ObjectId.isValid(auctionId)) return null;
    const auction = await Auction.findById(auctionId)
        .populate("results.player", "name role nationality image basePrice")
        .populate("results.soldTo", "name shortName logo theme")
        .populate("teams.team", "name shortName logo theme")
        .populate("players.player", "name role nationality basePrice")
        .lean();
    if (!auction) return null;

    const squads = new Map(
        auction.teams.map((entry) => [
            String(entry.team?._id ?? entry.team),
            {
                team: {
                    _id: entry.team?._id,
                    name: entry.team?.name || "Unknown team",
                    shortName: entry.team?.shortName || "",
                    logo: entry.team?.logo || "",
                    theme: entry.team?.theme || "",
                },
                purseRemaining: entry.purseRemaining,
                startingPurse: auction.settings?.maxPursePerTeam,
                players: [],
            },
        ])
    );

    for (const result of auction.results || []) {
        const key = String(result.soldTo?._id ?? result.soldTo);
        if (!squads.has(key) || !result.player) continue;
        squads.get(key).players.push({
            _id: result.player._id,
            name: result.player.name,
            role: result.player.role,
            nationality: result.player.nationality,
            image: result.player.image,
            basePrice: result.player.basePrice,
            price: result.amount,
            soldAt: result.timestamp,
        });
    }

    const teams = [...squads.values()].map((squad) => {
        const totalSpent = squad.players.reduce((sum, p) => sum + (p.price || 0), 0);
        return {
            ...squad,
            totalSpent,
            squadSize: squad.players.length,
            overseas: squad.players.filter(isOverseas).length,
            players: squad.players.sort((a, b) => (b.price || 0) - (a.price || 0)),
        };
    });
    teams.sort((a, b) => b.totalSpent - a.totalSpent);

    const unsold = (auction.players || [])
        .filter((p) => p.status === "unsold" && p.player)
        .map((p) => ({ _id: p.player._id, name: p.player.name, role: p.player.role, basePrice: p.player.basePrice }));

    return {
        auction: {
            _id: auction._id,
            name: auction.name,
            season: auction.season,
            status: auction.status,
            settings: auction.settings,
        },
        teams,
        unsold,
    };
};

// Spreadsheet cells that start with = + - @ are formulas; a leading ' stops them running when the file is opened
const csvCell = (value) => {
    let text = value === undefined || value === null ? "" : String(value);
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const squadsToCsv = ({ auction, teams, unsold }) => {
    const lines = [["Auction", "Team", "Player", "Role", "Nationality", "Price (INR)", "Base price (INR)"]];
    for (const team of teams) {
        for (const p of team.players) {
            lines.push([auction.name, team.team.name, p.name, p.role, p.nationality, p.price, p.basePrice]);
        }
    }
    for (const p of unsold) {
        lines.push([auction.name, "UNSOLD", p.name, p.role, "", "", p.basePrice]);
    }
    return lines.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
};

const round = (n) => Math.round(n);

// Numbers behind the "Auction results" page, for one auction or for all of them.
export const auctionStats = async ({ auctionId } = {}) => {
    const match = { "results.0": { $exists: true } };
    if (auctionId) {
        if (!mongoose.Types.ObjectId.isValid(auctionId)) return null;
        match._id = new mongoose.Types.ObjectId(auctionId);
    }

    const rows = await Auction.aggregate([
        { $match: match },
        { $unwind: "$results" },
        { $lookup: { from: "players", localField: "results.player", foreignField: "_id", as: "p" } },
        { $lookup: { from: "teams", localField: "results.soldTo", foreignField: "_id", as: "t" } },
        {
            $project: {
                auctionId: "$_id",
                auctionName: "$name",
                amount: "$results.amount",
                player: { $first: "$p" },
                team: { $first: "$t" },
            },
        },
    ]);

    const sales = rows
        .filter((r) => r.player && r.amount > 0)
        .map((r) => ({
            player: r.player.name,
            playerId: r.player._id,
            role: r.player.role,
            nationality: r.player.nationality,
            basePrice: r.player.basePrice,
            price: r.amount,
            team: r.team?.name || "Unknown team",
            teamShort: r.team?.shortName || "",
            teamId: r.team?._id,
            auction: r.auctionName,
            auctionId: r.auctionId,
        }));

    const total = sales.reduce((sum, s) => sum + s.price, 0);

    const spendByTeam = new Map();
    for (const s of sales) {
        const key = `${s.auctionId}:${s.teamId}`;
        const entry = spendByTeam.get(key) || { team: s.team, teamShort: s.teamShort, auction: s.auction, spent: 0, players: 0 };
        entry.spent += s.price;
        entry.players += 1;
        spendByTeam.set(key, entry);
    }

    const byRole = new Map();
    for (const s of sales) {
        const entry = byRole.get(s.role) || { role: s.role, sold: 0, total: 0 };
        entry.sold += 1;
        entry.total += s.price;
        byRole.set(s.role, entry);
    }

    const overseas = sales.filter(isOverseas);

    const unsoldFilter = auctionId ? { _id: new mongoose.Types.ObjectId(auctionId) } : {};
    const unsoldRows = await Auction.aggregate([
        { $match: unsoldFilter },
        { $unwind: "$players" },
        { $match: { "players.status": "unsold" } },
        { $lookup: { from: "players", localField: "players.player", foreignField: "_id", as: "p" } },
        { $project: { auction: "$name", player: { $first: "$p" } } },
        { $limit: 200 },
    ]);

    return {
        totals: {
            sold: sales.length,
            unsold: unsoldRows.length,
            totalSpent: total,
            averagePrice: sales.length ? round(total / sales.length) : 0,
            overseasSold: overseas.length,
            indianSold: sales.length - overseas.length,
        },
        mostExpensive: [...sales].sort((a, b) => b.price - a.price).slice(0, 10),
        biggestPremium: [...sales]
            .filter((s) => s.basePrice > 0)
            .map((s) => ({ ...s, premiumPercent: round(((s.price - s.basePrice) / s.basePrice) * 100) }))
            .sort((a, b) => b.premiumPercent - a.premiumPercent)
            .slice(0, 5),
        biggestSpenders: [...spendByTeam.values()].sort((a, b) => b.spent - a.spent).slice(0, 10),
        byRole: [...byRole.values()]
            .map((r) => ({ ...r, average: round(r.total / r.sold) }))
            .sort((a, b) => b.total - a.total),
        unsoldPlayers: unsoldRows
            .filter((r) => r.player)
            .map((r) => ({ name: r.player.name, role: r.player.role, basePrice: r.player.basePrice, auction: r.auction })),
    };
};
