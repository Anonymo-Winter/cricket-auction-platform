import { AnimatePresence, motion } from "framer-motion";

const labelFor = (seconds) => {
    if (seconds <= 0) return null;
    if (seconds <= 2) return "Last call!";
    if (seconds <= 5) return "Going twice…";
    if (seconds <= 10) return "Going once…";
    return null;
};

// "Going once…" at 10 seconds, "Going twice…" at 5, "Last call!" at 2
export default function GoingBanner({ seconds, active, large = false }) {
    const label = active ? labelFor(seconds) : null;
    return (
        <div className={large ? "h-16" : "h-7"}>
            <AnimatePresence mode="wait">
                {label && (
                    <motion.p
                        key={label}
                        initial={{ opacity: 0, y: 6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className={`text-center font-display font-semibold tracking-tight ${
                            seconds <= 2 ? "text-red-500" : "text-gold-500"
                        } ${large ? "text-5xl" : "text-lg"}`}
                    >
                        {label}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}
