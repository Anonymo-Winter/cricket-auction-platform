import Auction from "../models/auction.models.js";
import AuctionHistory from "../models/auctionHistory.models.js";
import Player from "../models/player.models.js";
import Team from "../models/team.models.js";
import User from "../models/user.models.js";

// Marks an auction completed and archives its results (AuctionHistory). Used by the "complete" button and by the
// server itself when an auction has nothing left to sell. Returns { auctionHistory } or { error, status }.
export const completeAuction = async (auctionId) => {
    const id = auctionId;

    const auction = await Auction.findById(id)
        .populate({ path: "players.player", model: "Player" })
        .populate({ path: "teams.team", model: "Team" })
        .populate({ path: "results.player", model: "Player" })
        .populate({ path: "results.soldTo", model: "Team" })
        .populate({ path: "auctioneer", model: "User" });

    if (!auction) return { error: "Auction not found", status: 404 };
    if (auction.status === "completed") return { error: "Auction is already completed", status: 400 };

    const auctionHistoryLogs = auction.logs
        .map((log) => {
            return {
                event: log.action === "sold" || log.action === "unsold" ? log.action : null,
                player: log.details?.player,
                team: log.details?.team,
                amount: log.details?.amount,
                timestamp: log.timestamp,
            };
        })
        .filter((log) => log.event);

    const auctionHistory = new AuctionHistory({
        _id: id,
        name: auction.name,
        teams: auction.teams.map((teamEntry) => {
            const teamResults = auction.results.filter(
                (result) => result.soldTo && result.soldTo._id.toString() === teamEntry.team._id.toString()
            );

            return {
                team: teamEntry.team,
                players: teamResults.map((result) => ({
                    player: result.player,
                    purchasePrice: result.amount || 0,
                })),
                totalSpent: teamResults.reduce((sum, result) => sum + (result.amount || 0), 0),
                playersBought: teamResults.length,
                overseasPlayersBought: teamResults.filter((result) => result.player.isOverseas).length,
                purseRemaining: teamEntry.purseRemaining,
            };
        }),

        players: auction.results.map((result) => ({
            player: result.player,
            soldTo: result.soldTo ? result.soldTo : null,
            soldPrice: result.amount || 0,
            highestBid:
                auction.bids
                    .filter((bid) => bid.player.toString() === result.player._id.toString())
                    .reduce((max, bid) => Math.max(max, bid.amount), 0) ||
                result.amount ||
                0,
        })),

        summary: {
            totalPlayersSold: auction.results.length,
            totalAmountSpent: auction.results.reduce((sum, result) => sum + (result.amount || 0), 0),
            overseasPlayersSold: auction.results.filter((result) => result.player.isOverseas).length,
        },

        logs: auctionHistoryLogs,

        completedAt: new Date(),
    });

    await auctionHistory.save();

    // Clear `currentAuction` fields from players, teams, and auctioneer
    await Player.updateMany({ currentAuction: id }, { $unset: { currentAuction: 1 } });
    await Team.updateMany({ currentAuction: id }, { $unset: { currentAuction: 1 } });
    await User.updateMany({ currentAuction: id }, { $unset: { currentAuction: 1 } });

    auction.status = "completed";
    auction.logs.push({ action: "complete", timestamp: new Date() });

    await auction.save();

    return { auctionHistory };
};
