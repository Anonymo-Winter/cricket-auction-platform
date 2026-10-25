import AuditLog from "../models/auditLog.models.js";
import User from "../models/user.models.js";

// Never lets an audit failure break the request it describes.
export const logAudit = async ({ actor, action, target = {}, meta = {} }) => {
    try {
        await AuditLog.create({
            actor: actor?.id || null,
            actorName: actor?.name || (actor ? undefined : "System / visitor"),
            actorRole: actor?.role,
            action,
            targetType: target.type,
            targetId: target.id ? String(target.id) : undefined,
            targetLabel: target.label,
            meta,
        });
    } catch (error) {
        console.error("Failed to write audit log:", error.message);
    }
};

// Route middleware: records an audit entry when the request succeeds.
// `describe(req)` returns { target: { type, id, label? }, meta? }. A missing user label is looked up
// before the handler runs, so entries for deleted accounts still say who they were.
export const auditOnSuccess = (action, describe) => async (req, res, next) => {
    let info = {};
    try {
        info = describe(req) || {};
        const t = info.target;
        if (t?.type === "user" && t.id && !t.label) {
            const u = await User.findById(t.id).select("name email").lean();
            if (u) t.label = `${u.name} <${u.email}>`;
        }
    } catch {
        // fall through with whatever we have
    }
    res.on("finish", () => {
        if (res.statusCode < 400) {
            logAudit({ actor: req.user, action, target: info.target, meta: info.meta });
        }
    });
    next();
};
