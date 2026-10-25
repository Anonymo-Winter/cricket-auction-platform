// A friendly "nothing here yet" panel, used instead of bare grey or red text so every empty case looks the same.
// `compact` is for spots inside a card or table where the full panel would be too big.
export default function EmptyState({ icon: Icon, title, hint, children, compact = false }) {
    return (
        <div
            className={
                compact
                    ? "flex flex-col items-center rounded-xl bg-slate-50 px-4 py-6 text-center"
                    : "mx-auto my-6 flex max-w-md flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center"
            }
        >
            {Icon && (
                <span
                    className={`mb-3 flex items-center justify-center rounded-xl bg-navy-900 text-gold-400 ${compact ? "h-9 w-9" : "h-12 w-12"}`}
                >
                    <Icon className={compact ? "h-4 w-4" : "h-6 w-6"} />
                </span>
            )}
            <p className={`font-display font-semibold tracking-tight text-navy-900 ${compact ? "text-base" : "text-lg"}`}>{title}</p>
            {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
            {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
        </div>
    );
}
