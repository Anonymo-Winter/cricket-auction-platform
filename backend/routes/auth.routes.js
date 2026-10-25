import express from "express";
import {
    login,
    checkAuth,
    logout,
    editProfile,
    changePassword,
    isEmailAlreadyInUse,
    signupAndCreateTeam,
} from "../controllers/auth.controller.js";
import { getSignupConfig, getInviteInfo, acceptInvite, resetPassword } from "../controllers/account.controller.js";
import { verifyToken, requireSelfOrAdmin } from "../middlewares/verifyToken.middleware.js";
import { loginLimiter, signupLimiter, tokenLimiter, emailCheckLimiter } from "../middlewares/rateLimit.js";

const router = express.Router();

router.get("/signup-config", getSignupConfig);
router.get("/invite/:token", tokenLimiter, getInviteInfo);
router.post("/accept-invite", tokenLimiter, acceptInvite);
router.post("/reset-password", tokenLimiter, resetPassword);

router.post("/signup-team", signupLimiter, signupAndCreateTeam);

router.post("/login", loginLimiter, login);

router.get("/check-auth", verifyToken, checkAuth);

router.post("/edit-profile/:id", verifyToken, requireSelfOrAdmin("id"), editProfile);

router.post("/change-password/:id", verifyToken, requireSelfOrAdmin("id"), changePassword);

router.post("/logout", logout);

router.post("/is-email-already-in-use", emailCheckLimiter, isEmailAlreadyInUse);

export default router;
