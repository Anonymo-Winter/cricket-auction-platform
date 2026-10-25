import express from "express";
import {
    deleteUser,
    assignAuctioneer,
    deassignAuctioneer,
    deleteAuctioneer,
    getAuctioneers,
    getUsers,
    getPasswordValidity,
    changeUserRole,
} from "../controllers/userController.js";
import {
    inviteAuctioneer,
    inviteOwner,
    createResetLink,
    setUserStatus,
    getAuditLog,
} from "../controllers/account.controller.js";
import { verifyToken, requireRole } from "../middlewares/verifyToken.middleware.js";
import { auditOnSuccess } from "../utils/audit.js";

const router = express.Router();

// Everything under /api/user is admin-only user management
router.use(verifyToken, requireRole("admin"));

const userTarget = (field) => (req) => ({ target: { type: "user", id: req.body[field] } });

router.get("/get-auctioneers", getAuctioneers);
router.get("/get-users", getUsers);
router.get("/audit-log", getAuditLog);
router.post("/check-password", getPasswordValidity);

router.post(
    "/invite-auctioneer",
    auditOnSuccess("invite.auctioneer.created", (req) => ({
        target: { type: "invite", label: `${req.body.name} <${req.body.email}>` },
    })),
    inviteAuctioneer
);
router.post(
    "/invite-owner",
    auditOnSuccess("invite.owner.created", (req) => ({
        target: { type: "invite", label: req.body.email || "any email" },
    })),
    inviteOwner
);
router.post("/reset-link", auditOnSuccess("password.reset-link.created", userTarget("userId")), createResetLink);
router.post(
    "/set-status",
    auditOnSuccess("user.status.changed", (req) => ({
        target: { type: "user", id: req.body.userId },
        meta: { status: req.body.status },
    })),
    setUserStatus
);

router.post(
    "/assign-auctioneer",
    auditOnSuccess("auctioneer.assigned", (req) => ({
        target: { type: "user", id: req.body.auctioneerId },
        meta: { auctionId: req.body.auctionId },
    })),
    assignAuctioneer
);
router.post(
    "/deassign-auctioneer",
    auditOnSuccess("auctioneer.unassigned", (req) => ({
        target: { type: "user", id: req.body.auctioneerId },
        meta: { auctionId: req.body.auctionId },
    })),
    deassignAuctioneer
);
router.post(
    "/update-user-role",
    auditOnSuccess("user.role.changed", (req) => ({
        target: { type: "user", id: req.body.userId },
        meta: { role: req.body.role },
    })),
    changeUserRole
);
router.delete("/delete-auctioneer", auditOnSuccess("user.deleted", userTarget("auctioneerId")), deleteAuctioneer);
router.delete("/delete-user", auditOnSuccess("user.deleted", userTarget("userId")), deleteUser);

export default router;
