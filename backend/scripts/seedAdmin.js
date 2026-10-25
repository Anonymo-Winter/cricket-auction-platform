// Creates the FIRST admin account. It refuses to run once an admin exists, so it can't be used
// later to take over the system; further admins are made from Dashboard > Access Control.
//
// Usage:  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='min-8-chars' [ADMIN_NAME='Your Name'] npm run seed:admin
//
// Recovery (all admins locked out): add ALLOW_ADDITIONAL_ADMIN=1 to deliberately create another one.
import dotenv from "dotenv";
import mongoose from "mongoose";
import validator from "validator";
import User from "../models/user.models.js";
import AuditLog from "../models/auditLog.models.js";
import { emailLookupKeys, storableEmail } from "../utils/email.js";

dotenv.config();

const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = "Administrator", ALLOW_ADDITIONAL_ADMIN } = process.env;

const fail = (message) => {
    console.error(message);
    process.exit(1);
};

if (!ADMIN_EMAIL || !validator.isEmail(ADMIN_EMAIL)) fail("Set ADMIN_EMAIL to a valid email address.");
if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) fail("Set ADMIN_PASSWORD (at least 8 characters).");

await mongoose.connect(process.env.MONGO_URL);

try {
    if (!ALLOW_ADDITIONAL_ADMIN && (await User.exists({ role: "admin" }))) {
        fail("An admin already exists. Create more admins from Dashboard > Access Control (or set ALLOW_ADDITIONAL_ADMIN=1 for recovery).");
    }

    const existing = await User.findOne({ email: { $in: emailLookupKeys(ADMIN_EMAIL) } });
    let user;
    if (existing) {
        existing.role = "admin";
        existing.permissions = { canManageUsers: true };
        existing.status = "active";
        existing.password = ADMIN_PASSWORD; // hashed by the pre-save hook
        user = await existing.save();
        console.log(`Updated existing user ${user.email}: now an admin with the given password.`);
    } else {
        user = await User.create({
            name: ADMIN_NAME,
            email: storableEmail(ADMIN_EMAIL),
            password: ADMIN_PASSWORD,
            role: "admin",
        });
        console.log(`Created admin ${user.email}.`);
    }

    await AuditLog.create({
        actorName: "seed script",
        action: "admin.seeded",
        targetType: "user",
        targetId: String(user._id),
        targetLabel: `${user.name} <${user.email}>`,
    });
} finally {
    await mongoose.disconnect();
}
