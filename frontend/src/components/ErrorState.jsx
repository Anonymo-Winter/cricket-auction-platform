import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Lock, RefreshCw, SearchX, WifiOff } from "lucide-react";
import { describeError } from "../lib/errors";

const ICONS = { "not-found": SearchX, network: WifiOff, forbidden: Lock, server: AlertTriangle };

// The one error screen for the whole app: failed loads, missing records, bad links, no connection.
//   <ErrorState error={error} what="auction" backTo="/auctions" backLabel="Back to auctions" onRetry={refetch} />
// Pass `title` / `hint` to override, `dark` for the big-screen page, `inline` to skip the full-height centring.
export default function ErrorState({ error, what = "page", title, hint, kind, backTo, backLabel, onRetry, dark = false, inline = false, onBack }) {
    const navigate = useNavigate();
    const info = kind ? { kind, retry: kind === "network" || kind === "server" } : describeError(error, what);
    const Icon = ICONS[info.kind] || AlertTriangle;
    const showRetry = (info.retry || !!onRetry) && info.kind !== "not-found";
    const retry = onRetry || (() => window.location.reload());

    const card = dark
        ? "border-white/10 bg-white/5 text-white"
        : "border-slate-200 bg-white text-navy-900 shadow-sm";
    const sub = dark ? "text-white/60" : "text-slate-500";

    return (
        <div className={`flex w-full items-center justify-center px-4 ${inline ? "py-10" : dark ? "min-h-screen py-16" : "min-h-[60vh] py-16"}`} role="alert">
            <div className={`w-full max-w-md rounded-2xl border p-8 text-center ${card}`}>
                <span className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${dark ? "bg-white/10 text-gold-400" : "bg-navy-900 text-gold-400"}`}>
                    <Icon className="h-7 w-7" />
                </span>
                <h2 className="font-display text-xl font-bold tracking-tight">{title || info.title}</h2>
                <p className={`mt-2 text-sm ${sub}`}>{hint || info.hint}</p>
                {(backTo || onBack || showRetry) && (
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                        {(backTo || onBack) && (
                            <button
                                type="button"
                                onClick={() => (onBack ? onBack() : navigate(backTo))}
                                className="inline-flex items-center gap-2 rounded-lg bg-gold-400 px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-gold-300"
                            >
                                <ArrowLeft className="h-4 w-4" /> {backLabel || "Go back"}
                            </button>
                        )}
                        {showRetry && (
                            <button
                                type="button"
                                onClick={retry}
                                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold ${
                                    dark ? "border-white/30 text-white hover:bg-white/10" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                }`}
                            >
                                <RefreshCw className="h-4 w-4" /> Try again
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
