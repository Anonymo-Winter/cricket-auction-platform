const STYLES = {
    sold: "bg-emerald-100 text-emerald-800",
    unsold: "bg-slate-200 text-slate-700",
    pending: "bg-gold-300/40 text-gold-600",
    current: "bg-navy-900 text-gold-300",
    available: "bg-emerald-100 text-emerald-800",
    active: "bg-emerald-100 text-emerald-800",
    scheduled: "bg-gold-300/40 text-gold-600",
    completed: "bg-slate-200 text-slate-700",
    paused: "bg-orange-100 text-orange-800",
    waiting: "bg-sky-100 text-sky-800",
    cancelled: "bg-red-100 text-red-700",
};

// A small coloured label for a status word (sold, unsold, pending, ...)
export default function StatusPill({ value }) {
    const text = String(value ?? "");
    return (
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STYLES[text.toLowerCase()] || "bg-slate-100 text-slate-700"}`}>
            {text || "—"}
        </span>
    );
}
