import mongoose from "mongoose";
import validator from "validator";
import User from "../models/user.models.js";
import AuditLog from "../models/auditLog.models.js";
import { issueToken, findValidToken, consumeToken, clientUrl, INVITE_TTL_HOURS, RESET_TTL_HOURS } from "../utils/tokens.js";
import { emailLookupKeys, storableEmail } from "../utils/email.js";
import { setAuthCookie } from "../utils/authCookie.js";
import { logAudit } from "../utils/audit.js";

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const fail = (res, error, label) => {
    if (error instanceof HttpError) {
        return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error(`${label}:`, error);
    return res.status(500).json({ success: false, message: "Internal server error" });
};

const linkFor = (path, raw) => `${clientUrl()}/${path}/${raw}`;

// "open": anyone can sign up as a team owner. "invite": signup needs an owner invite link from an admin.
export const signupMode = () => (process.env.SIGNUP_MODE === "invite" ? "invite" : "open");

// ---------------------------------------------------------------- public

export const getSignupConfig = (req, res) => res.status(200).json({ success: true, mode: signupMode() });

export const getInviteInfo = async (req, res) => {
    try {
        const token = await findValidToken(req.params.token, ["auctioneer-invite", "owner-invite", "password-reset"]);
        if (!token) {
            return res.status(404).json({ success: false, message: "This link is invalid or has expired" });
        }
        let name = token.name;
        let email = token.email;
        if (token.type === "password-reset") {
            const user = await User.findById(token.user).select("name email");
            if (!user) return res.status(404).json({ success: false, message: "This link is invalid or has expired" });
            name = user.name;
            email = user.email;
        }
        return res.status(200).json({ success: true, type: token.type, name, email });
    } catch (error) {
        return fail(res, error, "getInviteInfo");
    }
};

export const acceptInvite = async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) {
        return res.status(400).json({ success: false, message: "Token and password are required" });
    }
    if (password.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
    }

    const session = await mongoose.startSession();
    let created;
    try {
        await session.withTransaction(async () => {
            const invite = await consumeToken(token, ["auctioneer-invite"], session);
            if (!invite) throw new HttpError(400, "This invite link is invalid or has expired");

            const existing = await User.findOne({ email: { $in: emailLookupKeys(invite.email) } }).session(session);
            if (existing) throw new HttpError(400, "An account with this email already exists");

            [created] = await User.create(
                [{ name: invite.name, email: storableEmail(invite.email), password, role: "auctioneer" }],
                { session }
            );
        });

        setAuthCookie(res, created.email, created.id);
        await logAudit({
            actor: { id: created.id, name: created.name, role: created.role },
            action: "invite.accepted",
            target: { type: "user", id: created.id, label: `${created.name} <${created.email}>` },
            meta: { role: "auctioneer" },
        });

        const user = created.toObject();
        delete user.password;
        return res.status(201).json({ success: true, message: "Account created", user });
    } catch (error) {
        return fail(res, error, "acceptInvite");
    } finally {
        session.endSession();
    }
};

export const resetPassword = async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) {
        return res.status(400).json({ success: false, message: "Token and password are required" });
    }
    if (password.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
    }

    const session = await mongoose.startSession();
    let target;
    try {
        await session.withTransaction(async () => {
            const reset = await consumeToken(token, ["password-reset"], session);
            if (!reset) throw new HttpError(400, "This reset link is invalid or has expired");

            target = await User.findById(reset.user).session(session);
            if (!target) throw new HttpError(400, "This reset link is invalid or has expired");

            target.password = password; // hashed by the pre-save hook
            await target.save({ session });
        });

        await logAudit({
            actor: { id: target.id, name: target.name, role: target.role },
            action: "password.reset",
            target: { type: "user", id: target.id, label: `${target.name} <${target.email}>` },
        });
        return res.status(200).json({ success: true, message: "Password updated. You can now sign in." });
    } catch (error) {
        return fail(res, error, "resetPassword");
    } finally {
        session.endSession();
    }
};

// ---------------------------------------------------------------- admin (mounted behind requireRole("admin"))

export const inviteAuctioneer = async (req, res) => {
    try {
        const { name, email } = req.body;
        if (!name?.trim() || !email) {
            return res.status(400).json({ success: false, message: "Name and email are required" });
        }
        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Invalid email format" });
        }
        if (await User.exists({ email: { $in: emailLookupKeys(email) } })) {
            return res.status(400).json({ success: false, message: "An account with this email already exists" });
        }

        const { raw, doc } = await issueToken({
            type: "auctioneer-invite",
            email: email.trim(),
            name: validator.escape(name.trim()),
            createdBy: req.user.id,
            ttlHours: INVITE_TTL_HOURS,
        });
        return res.status(201).json({
            success: true,
            link: linkFor("invite", raw),
            expiresAt: doc.expiresAt,
        });
    } catch (error) {
        return fail(res, error, "inviteAuctioneer");
    }
};

export const inviteOwner = async (req, res) => {
    try {
        const { email } = req.body;
        if (email && !validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Invalid email format" });
        }
        if (email && (await User.exists({ email: { $in: emailLookupKeys(email) } }))) {
            return res.status(400).json({ success: false, message: "An account with this email already exists" });
        }

        const { raw, doc } = await issueToken({
            type: "owner-invite",
            email: email?.trim() || undefined,
            createdBy: req.user.id,
            ttlHours: INVITE_TTL_HOURS,
        });
        return res.status(201).json({
            success: true,
            link: `${clientUrl()}/signup?invite=${raw}`,
            expiresAt: doc.expiresAt,
        });
    } catch (error) {
        return fail(res, error, "inviteOwner");
    }
};

export const createResetLink = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }
        const user = await User.findById(userId).select("_id");
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const { raw, doc } = await issueToken({
            type: "password-reset",
            user: user._id,
            createdBy: req.user.id,
            ttlHours: RESET_TTL_HOURS,
        });
        return res.status(201).json({ success: true, link: linkFor("reset", raw), expiresAt: doc.expiresAt });
    } catch (error) {
        return fail(res, error, "createResetLink");
    }
};

// Deactivating keeps the account, its team and its bid history; the person just can't sign in or act.
export const setUserStatus = async (req, res) => {
    try {
        const { userId, status } = req.body;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }
        if (!["active", "inactive"].includes(status)) {
            return res.status(400).json({ success: false, message: "Status must be active or inactive" });
        }
        if (userId === req.user.id) {
            return res.status(400).json({ success: false, message: "You cannot change your own status" });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (status === "inactive" && user.role === "admin") {
            const otherActiveAdmins = await User.countDocuments({
                role: "admin",
                status: "active",
                _id: { $ne: user._id },
            });
            if (otherActiveAdmins === 0) {
                return res.status(400).json({ success: false, message: "You cannot deactivate the last active admin" });
            }
        }

        user.status = status;
        await user.save();
        return res.status(200).json({ success: true, status: user.status });
    } catch (error) {
        return fail(res, error, "setUserStatus");
    }
};

export const getAuditLog = async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const [entries, total] = await Promise.all([
            AuditLog.find()
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            AuditLog.countDocuments(),
        ]);
        return res.status(200).json({ success: true, entries, total, page, limit });
    } catch (error) {
        return fail(res, error, "getAuditLog");
    }
};
