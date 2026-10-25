import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatMoney } from "../lib/money.js";

const idOf = (v) => String(v?._id ?? v ?? "");

// Pops up "SOLD to <team> for <price>" or "UNSOLD" the moment a player's outcome is decided. It works out what
// changed by comparing each new auction snapshot with the previous one, so it needs nothing extra from the server.
export default function ResultFlash({ auction, sound, large = false, seconds = 5 }) {
    const [flash, setFlash] = useState(null);
    const previous = useRef(null); // { sold: number, unsold: Set<string> } from the last snapshot

    useEffect(() => {
        if (!auction) return;
        const results = auction.results || [];
        const unsold = new Set((auction.players || []).filter((p) => p.status === "unsold").map((p) => idOf(p.player)));

        const before = previous.current;
        previous.current = { sold: results.length, unsold };
        if (!before) return; // first snapshot: nothing just happened

        if (results.length > before.sold) {
            const last = results[results.length - 1];
            setFlash({
                type: "sold",
                player: last.player?.name || "Player",
                team: last.soldTo?.name || "a team",
                logo: last.soldTo?.logo,
                amount: last.amount,
            });
            sound?.play("sold");
        } else {
            const fresh = [...unsold].find((id) => !before.unsold.has(id));
            if (fresh) {
                const entry = (auction.players || []).find((p) => idOf(p.player) === fresh);
                setFlash({ type: "unsold", player: entry?.player?.name || "Player" });
                sound?.play("unsold");
            }
        }
    }, [auction, sound]);

    useEffect(() => {
        if (!flash) return undefined;
        const id = setTimeout(() => setFlash(null), seconds * 1000);
        return () => clearTimeout(id);
    }, [flash, seconds]);

    return (
        <AnimatePresence>
            {flash && (
                <motion.div
                    key={`${flash.type}-${flash.player}-${flash.amount ?? ""}`}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className={`pointer-events-none fixed inset-0 z-50 flex items-center justify-center ${
                        large ? "bg-black/70" : "bg-black/40"
                    }`}
                    role="status"
                    aria-live="polite"
                >
                    <div
                        className={`mx-4 rounded-3xl text-center shadow-2xl ${
                            flash.type === "sold" ? "bg-gradient-to-br from-emerald-600 to-emerald-800" : "bg-gradient-to-br from-slate-600 to-slate-800"
                        } ${large ? "px-20 py-14" : "px-8 py-8"} text-white`}
                    >
                        <p className={`font-display font-bold tracking-tight ${large ? "text-7xl" : "text-4xl"}`}>
                            {flash.type === "sold" ? "Sold!" : "Unsold"}
                        </p>
                        <p className={`mt-3 font-semibold ${large ? "text-5xl" : "text-2xl"}`}>{flash.player}</p>
                        {flash.type === "sold" && (
                            <div className={`mt-4 flex items-center justify-center gap-3 ${large ? "text-4xl" : "text-xl"}`}>
                                {flash.logo && <img src={flash.logo} alt="" className={`${large ? "h-16 w-16" : "h-9 w-9"} rounded-full bg-white object-contain`} />}
                                <span>
                                    to <strong>{flash.team}</strong> for <strong className="text-gold-300">{formatMoney(flash.amount)}</strong>
                                </span>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
