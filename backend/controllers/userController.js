import mongoose from "mongoose";
import Team from "../models/team.models.js";
import Auction from "../models/auction.models.js";
import { compare } from "bcrypt";

import User from "../models/user.models.js";

export const getAuctioneers = async (req, res) => {
    try {
        const auctioneers = await User.find({ role: "auctioneer" }).select("-password").populate("assignedAuctions.auctionId", "name");
        res.status(200).json(auctioneers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getUsers = async (req, res) => {
    try {
        const users = await User.find({ role: "user" }).select("-password");
        res.status(200).json({ users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getPasswordValidity = async (req, res) => {
    const { userId, password } = req.body;
    try {
        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }
        const user = await User.findById(userId);
        const veryfyPassword = await compare(password, user.password);
        if (!veryfyPassword) {
            return res.status(400).json({ success: false, message: "Invalid password" });
        }
        return res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const assignAuctioneer = async (req, res) => {
    try {
        const { auctioneerId, auctionId } = req.body;

        if (!auctioneerId || !auctionId) {
            return res.status(400).json({
                success: false,
                message: "Auctioneer ID and Auction ID are required",
            });
        }

        const [targetAuction, auctioneer] = await Promise.all([
            Auction.findById(auctionId),
            User.findById(auctioneerId),
        ]);

        if (!targetAuction) {
            return res.status(404).json({
                success: false,
                message: "Auction not found",
            });
        }

        if (!auctioneer) {
            return res.status(404).json({
                success: false,
                message: "Auctioneer not found",
            });
        }

        if (auctioneer.role !== "auctioneer") {
            return res.status(400).json({
                success: false,
                message: "Selected user does not have auctioneer privileges",
            });
        }

        if (targetAuction.auctioneer) {
            const currentAuctioneer = await User.findById(targetAuction.auctioneer, "name");
            return res.status(400).json({
                success: false,
                message: `Auction is already assigned to ${
                    currentAuctioneer ? currentAuctioneer.name : "another auctioneer"
                }`,
            });
        }

        if (!targetAuction.startTime || !targetAuction.endTime) {
            return res.status(400).json({
                success: false,
                message: "Auction scheduling information is incomplete",
            });
        }

        const auctionStart = new Date(targetAuction.startTime);
        const auctionEnd = targetAuction.endTime
            ? new Date(targetAuction.endTime)
            : new Date(auctionStart.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours if not specified

        const auctioneersExistingAuctions = await Auction.find({
            auctioneer: auctioneerId,
            status: { $nin: ["completed", "cancelled"] },
        });

        const conflictingAuction = auctioneersExistingAuctions.find((existingAuction) => {
            if (existingAuction._id.toString() === auctionId) {
                return false;
            }

            const existingStart = new Date(existingAuction.startTime);
            const existingEnd = existingAuction.endTime
                ? new Date(existingAuction.endTime)
                : new Date(existingStart.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours

            const hasOverlap =
                // New auction starts during existing auction
                (auctionStart >= existingStart && auctionStart < existingEnd) ||
                // New auction ends during existing auction
                (auctionEnd > existingStart && auctionEnd <= existingEnd) ||
                // New auction completely encompasses existing auction
                (auctionStart <= existingStart && auctionEnd >= existingEnd);

            return hasOverlap;
        });

        if (conflictingAuction) {
            const conflictStart = new Date(conflictingAuction.startTime).toLocaleString();
            const conflictEnd = conflictingAuction.endTime
                ? new Date(conflictingAuction.endTime).toLocaleString()
                : "unspecified";

            return res.status(409).json({
                success: false,
                message: `Time conflict detected with another auction (ID: ${conflictingAuction._id}) scheduled from ${conflictStart} to ${conflictEnd}`,
            });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const updatedAuction = await Auction.findByIdAndUpdate(
                auctionId,
                {
                    auctioneer: auctioneerId,
                    endTime: targetAuction.endTime || auctionEnd,
                },
                { new: true, session }
            );

            auctioneer.assignedAuctions = auctioneer.assignedAuctions || [];

            auctioneer.assignedAuctions = auctioneer.assignedAuctions.filter(
                (auction) => auction.auctionId.toString() !== auctionId
            );

            auctioneer.assignedAuctions.push({
                auctionId: auctionId,
                startTime: auctionStart,
                endTime: auctionEnd,
            });

            auctioneer.status = "active";

            await auctioneer.save({ session });

            await session.commitTransaction();

            return res.status(200).json({
                success: true,
                message: "Auctioneer assigned successfully",
                auction: updatedAuction,
            });
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    } catch (error) {
        console.error("Error assigning auctioneer:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

export const deassignAuctioneer = async (req, res) => {
    try {
        const { auctioneerId, auctionId } = req.body;

        if (!auctioneerId || !auctionId) {
            return res.status(400).json({
                success: false,
                message: "Auctioneer ID and Auction ID are required",
            });
        }

        if (!mongoose.isValidObjectId(auctioneerId) || !mongoose.isValidObjectId(auctionId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Auctioneer ID or Auction ID",
            });
        }

        const auction = await Auction.findById(auctionId);
        if (!auction) {
            return res.status(404).json({
                success: false,
                message: "Auction not found",
            });
        }

        if (!auction.auctioneer || auction.auctioneer.toString() !== auctioneerId) {
            return res.status(400).json({
                success: false,
                message: "This auction is either not assigned to the given auctioneer or already unassigned",
            });
        }

        if (["active", "completed", "waiting"].includes(auction.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot remove auctioneer from an ${auction.status} auction`,
            });
        }

        auction.auctioneer = null;
        await auction.save();

        const user = await User.findByIdAndUpdate(
            auctioneerId,
            { $pull: { assignedAuctions: { auctionId } } },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: "Auctioneer successfully removed from auction",
            auction: auction,
            assigned: user.assignedAuctions,
            updatedUser: user,
        });
    } catch (error) {
        console.error("Error removing auctioneer:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

export const deleteAuctioneer = async (req, res) => {
    try {
        const { auctioneerId } = req.body;

        if (!auctioneerId) {
            return res.status(400).json({
                success: false,
                message: "Auctioneer ID is required",
            });
        }

        const auctioneer = await User.findById(auctioneerId);
        if (!auctioneer) {
            return res.status(404).json({
                success: false,
                message: "Auctioneer not found",
            });
        }

        if (auctioneer.role !== "auctioneer") {
            return res.status(400).json({
                success: false,
                message: "Selected user is not an auctioneer",
            });
        }

        const activeAuctions = await Auction.find({
            auctioneer: auctioneerId,
            status: { $in: ["scheduled", "active"] },
        });

        if (activeAuctions.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Cannot delete auctioneer as they are assigned to active/upcoming auctions",
                activeAuctions: activeAuctions.map((auction) => ({
                    id: auction._id,
                    title: auction.title,
                    status: auction.status,
                    startTime: auction.startTime,
                })),
            });
        }

        await User.findByIdAndDelete(auctioneerId);

        return res.status(200).json({
            success: true,
            message: "Auctioneer deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting auctioneer:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        switch (user.role) {
            case "user":
                if (user.team) {
                    const team = await Team.findById(user.team);
                    if (team) {
                        return res.status(409).json({
                            success: false,
                            message:
                                "Cannot delete user as they are managing a team. Please reassign or delete the team first.",
                        });
                    }
                }
                break;

            case "auctioneer": {
                const activeAuctions = await Auction.find({
                    auctioneer: userId,
                    status: { $in: ["scheduled", "in_progress"] },
                });

                if (activeAuctions.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: "Cannot delete user as they are assigned to active/upcoming auctions as an auctioneer",
                        activeAuctions: activeAuctions.map((auction) => ({
                            id: auction._id,
                            title: auction.title,
                            status: auction.status,
                            startTime: auction.startTime,
                        })),
                    });
                }
                break;
            }
            case "admin": {
                const adminCount = await User.countDocuments({ role: "admin" });
                if (adminCount <= 1) {
                    return res.status(403).json({
                        success: false,
                        message: "Cannot delete the only admin user in the system",
                    });
                }
                break;
            }
        }

        if (user.auctionStatus && user.auctionStatus.isActive) {
            return res.status(409).json({
                success: false,
                message: "Cannot delete user while they have an active bidding session",
            });
        }

        await User.findByIdAndDelete(userId);

        return res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting user:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

export const changeUserRole = async (req, res) => {
    try {
        const { userId, role } = req.body;

        if (!userId || !role) {
            return res.status(400).json({
                success: false,
                message: "User ID and new role are required",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID format",
            });
        }

        const allowedRoles = ["admin", "auctioneer", "user"];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `Role must be one of: ${allowedRoles.join(", ")}`,
            });
        }

        if (userId === req.user.id) {
            return res.status(400).json({
                success: false,
                message: "You cannot change your own role",
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Team owners need a team to bid with
        if (role === "user" && !user.team) {
            return res.status(400).json({
                success: false,
                message: "Cannot change role to user without assigning a team first",
            });
        }

        user.role = role;

        const permissions = {};
        if (role === "user") {
            permissions.canBid = true;
        } else if (role === "auctioneer") {
            permissions.canManageAuction = true;
        } else if (role === "admin") {
            permissions.canManageUsers = true;
        }

        user.permissions = permissions;

        // Use findByIdAndUpdate to avoid validation issues with complex nested schemas
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                role: role,
                permissions: permissions,
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "Failed to update user",
            });
        }

        return res.status(200).json({
            success: true,
            message: `User role successfully updated to ${role}`,
            user: {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                permissions: updatedUser.permissions,
            },
        });
    } catch (error) {
        console.error("Error changing user role:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while changing the user role",
            error: error.message,
        });
    }
};
