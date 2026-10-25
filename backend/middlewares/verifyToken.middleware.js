import jwt from "jsonwebtoken";
import User from "../models/user.models.js";

export const verifyToken = async (req, res, next) => {
    const token = req.cookies.jwt;
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "No authentication token found",
        });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_KEY);
    } catch (err) {
        const message = err.name === "TokenExpiredError" ? "Token has expired" : "Invalid token";
        return res.status(401).json({ success: false, message });
    }

    try {
        // Load the user on every request so role changes and suspensions apply immediately
        const user = await User.findById(decoded.id).select("_id name email role status team");
        if (!user) {
            return res.status(401).json({ success: false, message: "User no longer exists" });
        }
        if (user.status !== "active") {
            return res.status(403).json({ success: false, message: "Account is not active" });
        }

        req.userId = decoded.id;
        req.user = { id: user.id, name: user.name, email: user.email, role: user.role, team: user.team ? String(user.team) : null };
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during authentication",
        });
    }
};

// Use after verifyToken: requireRole("admin"), requireRole("admin", "auctioneer")
export const requireRole =
    (...roles) =>
    (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to perform this action",
            });
        }
        next();
    };

// Allows the request only when it targets the caller's own account (admins may target anyone)
export const requireSelfOrAdmin = (paramName = "id") => (req, res, next) => {
    if (req.user?.role === "admin" || req.user?.id === req.params[paramName]) {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: "You can only modify your own account",
    });
};

// Team owners may only act for their own team (the teamId in the request body)
export const requireOwnTeam = (req, res, next) => {
    if (!req.user?.team || String(req.body?.teamId) !== req.user.team) {
        return res.status(403).json({
            success: false,
            message: "You can only act on behalf of your own team",
        });
    }
    next();
};
