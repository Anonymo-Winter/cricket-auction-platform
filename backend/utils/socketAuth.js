import jwt from "jsonwebtoken";
import User from "../models/user.models.js";

const readCookie = (header = "", name) => {
    for (const part of header.split(";")) {
        const [key, ...rest] = part.trim().split("=");
        if (key === name) return decodeURIComponent(rest.join("="));
    }
    return null;
};

// Socket.io middleware. Visitors may connect and spectate, so this never rejects a connection;
// it just records who the caller is (or null) on socket.data.user.
export const socketAuth = async (socket, next) => {
    socket.data.user = null;
    try {
        const token = readCookie(socket.handshake.headers.cookie, "jwt");
        if (token) {
            const { id } = jwt.verify(token, process.env.JWT_KEY);
            const user = await User.findById(id).select("_id name role status team");
            if (user && user.status === "active") {
                socket.data.user = {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    team: user.team ? String(user.team) : null,
                };
            }
        }
    } catch {
        // invalid or expired token: treat as a visitor
    }
    next();
};

// Admins can run any auction; an auctioneer only the one assigned to them.
export const canControlAuction = (user, auction) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    const assigned = auction.auctioneer?._id ?? auction.auctioneer;
    return user.role === "auctioneer" && !!assigned && String(assigned) === String(user.id);
};
