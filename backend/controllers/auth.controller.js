import User from "../models/user.models.js";
import { compare } from "bcrypt";
import mongoose from "mongoose";
import Team from "../models/team.models.js";
import validator from "validator";
import { consumeToken } from "../utils/tokens.js";
import { setAuthCookie } from "../utils/authCookie.js";
import { emailLookupKeys } from "../utils/email.js";
import { logAudit } from "../utils/audit.js";
import { signupMode } from "./account.controller.js";
export const signupAndCreateTeam = async (req, res) => {
    const { name, email, password, teamName, shortName, logo, color = "white", inviteToken } = req.body;
    // Public signup only ever creates team owners; admins and auctioneers are created by an admin
    const role = "user";

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        if (!name || !email || !password) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        if (!validator.isEmail(email)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: "Invalid email format" });
        }

        if (password.length < 8) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long",
            });
        }

        const userExists = await User.findOne({ email: { $in: emailLookupKeys(email) } }).session(session);
        if (userExists) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        // Invite-only mode: an admin-issued owner invite is required (and is consumed by this signup)
        if (signupMode() === "invite") {
            const invite = inviteToken ? await consumeToken(inviteToken, ["owner-invite"], session) : null;
            const lockedToOtherEmail =
                invite?.email && !emailLookupKeys(email).some((k) => emailLookupKeys(invite.email).includes(k));
            if (!invite || lockedToOtherEmail) {
                await session.abortTransaction();
                session.endSession();
                return res.status(403).json({
                    success: false,
                    message: invite
                        ? "This invite was issued for a different email address"
                        : "Signup is invite-only. Ask an admin for an invite link.",
                });
            }
        }

        const user = await User.create(
            [
                {
                    name: validator.escape(name),
                    email: validator.normalizeEmail(email),
                    password,
                    role,
                },
            ],
            { session }
        );

        let teamData = null;

        // Every public signup is a team owner, so a team is always created
        {
            if (!teamName || !shortName || !logo) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    success: false,
                    message: "Team details are required for owner",
                });
            }

            const existingTeam = await Team.findOne({
                $or: [{ name: teamName }, { shortName }],
            }).session(session);

            if (existingTeam) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    success: false,
                    message:
                        existingTeam.name === teamName ? "Team name already taken" : "Team short name already taken",
                });
            }

            teamData = await Team.create(
                [
                    {
                        name: validator.escape(teamName),
                        shortName: validator.escape(shortName),
                        logo,
                        owner: user[0]._id,
                        theme: color,
                    },
                ],
                { session }
            );

            await User.findByIdAndUpdate(user[0]._id, { team: teamData[0]._id }, { session });
        }

        await session.commitTransaction();
        session.endSession();

        setAuthCookie(res, email, user[0].id);

        await logAudit({
            actor: { id: user[0].id, name: user[0].name, role: user[0].role },
            action: "user.signup",
            target: { type: "user", id: user[0].id, label: `${user[0].name} <${user[0].email}>` },
            meta: { team: teamName, viaInvite: signupMode() === "invite" },
        });

        const userResponse = user[0].toObject();
        userResponse.team = teamData ? teamData[0]._id : null;

        delete userResponse.password;

        return res.status(201).json({
            success: true,
            message: "User and team created successfully",
            user: userResponse,
            team: teamData ? teamData[0] : null,
        });
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();

        console.error("Error during signup and team creation:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }
        const user = await User.findOne({ email: { $in: emailLookupKeys(email) } }).populate("team").populate({
            path: "team",
            populate: ["players.player", { path: "players.auction", select: "name season" }],
        });
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }
        const isPassword = await compare(password, user.password);
        if (!isPassword) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }
        if (user.status !== "active") {
            return res.status(403).json({ success: false, message: "This account has been deactivated" });
        }

        setAuthCookie(res, email, user.id);

        user.password = undefined;
        return res.status(200).json({ success: true, message: "Login successful", user });
    } catch (error) {
        console.error("Error during login:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const checkAuth = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-password").populate({
            path: "team",
            populate: ["players.player", { path: "players.auction", select: "name season" }],
        });
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("Error checking auth:", error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const logout = (req, res) => {
    res.clearCookie("jwt");
    res.status(200).json({ success: true });
};

export const editProfile = async (req, res) => {
    const { id } = req.params;
    const { name, email } = req.body;
    try {
        if (!id) {
            return res.status(400).json({ success: false, message: "Id is required" });
        }
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User Not Found" });
        }
        if (name) {
            user.name = name;
        }
        if (email) {
            user.email = email;
        }
        await user.save();
        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("Error editing profile:", error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const changePassword = async (req, res) => {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;
    try {
        if (!id) {
            return res.status(400).json({ success: false, message: "Id not provided" });
        }
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User Not Found" });
        }
        const isPassword = await compare(oldPassword, user.password);

        if (!isPassword) {
            return res.status(401).json({ success: false, message: "Invalid credentials!" });
        }

        if (oldPassword == newPassword) {
            return res.status(400).json({ success: false, message: "Old Password and New Password can't be same" });
        }

        // Just set the plain password - the pre-save hook will hash it
        user.password = newPassword;
        await user.save();

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error changing password:", error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const isEmailAlreadyInUse = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        const user = await User.findOne({ email: { $in: emailLookupKeys(email) } });
        if (user) {
            return res.status(200).json({ success: false, message: "Email is already in use" });
        }

        return res.status(200).json({ success: true, message: "Email is available" });
    } catch (error) {
        console.error("Error occurred while checking email registry:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
