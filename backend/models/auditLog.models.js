import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
    {
        // null actor = the system or a public visitor (e.g. self signup)
        actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        actorName: String,
        actorRole: String,
        action: { type: String, required: true },
        targetType: String,
        targetId: String,
        targetLabel: String,
        meta: { type: Object, default: {} },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
