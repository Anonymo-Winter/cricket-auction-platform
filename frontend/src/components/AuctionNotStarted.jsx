import { useEffect, useState } from "react";
import { Clock, PauseCircle, Vote, XCircle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import LoadSpinner from "./LoadSpinner.jsx";
import EmptyState from "./EmptyState.jsx";

const TEXTS = {
    scheduled: { icon: Clock, title: "Auction starting soon", hint: "It opens automatically at the scheduled time. Keep this page open." },
    paused: { icon: PauseCircle, title: "Auction paused", hint: "The auction is paused for a moment. It will carry on from where it stopped." },
    waiting: { icon: Vote, title: "Owners are voting", hint: "Unsold players are being voted on. The auction carries on when voting closes." },
    completed: { icon: CheckCircle2, title: "Auction completed", hint: "This auction has finished." },
    cancelled: { icon: XCircle, title: "Auction cancelled", hint: "This auction was cancelled." },
};

const Unit = ({ value, label }) => (
    <div className="min-w-[4.5rem] rounded-xl bg-white/10 px-3 py-2 text-center">
        <p className="font-mono text-3xl font-bold text-white">{String(value).padStart(2, "0")}</p>
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/60">{label}</p>
    </div>
);

// Shown instead of the live page while an auction hasn't started, is paused, waiting on a vote, or over.
const AuctionNotStarted = ({ startTime, status, endTime }) => {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    if (!startTime && !status && !endTime) return <LoadSpinner />;

    if (!startTime || !status || !endTime) {
        return (
            <EmptyState icon={Clock} title="No auction to show" hint="There's nothing running right now.">
                <Link to="/auctions" className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">
                    See all auctions
                </Link>
            </EmptyState>
        );
    }

    const info = TEXTS[status] || { icon: Clock, title: "Checking the auction status", hint: "One moment while we confirm the details." };
    const Icon = info.icon;
    const left = Math.max(0, new Date(startTime).getTime() - now);
    const days = Math.floor(left / 86400000);
    const hours = Math.floor((left % 86400000) / 3600000);
    const minutes = Math.floor((left % 3600000) / 60000);
    const seconds = Math.floor((left % 60000) / 1000);
    const counting = status === "scheduled" && left > 0;

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white text-center shadow-sm">
                <div className="p-8">
                    <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-900 text-gold-400">
                        <Icon className="h-7 w-7" />
                    </span>
                    <h2 className="font-display text-2xl font-bold tracking-tight text-navy-900">{info.title}</h2>
                    <p className="mt-2 text-sm text-slate-500">{info.hint}</p>
                    {status === "scheduled" && (
                        <p className="mt-4 text-sm text-slate-600">
                            Scheduled for{" "}
                            <span className="font-semibold text-navy-900">
                                {new Date(startTime).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                            </span>
                        </p>
                    )}
                    {status === "completed" && (
                        <p className="mt-4 text-sm text-slate-600">
                            Ended{" "}
                            <span className="font-semibold text-navy-900">
                                {new Date(endTime).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                            </span>
                        </p>
                    )}
                </div>
                {counting && (
                    <div className="bg-gradient-to-r from-navy-800 to-navy-950 px-6 py-5">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold-300">Opens in</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {days > 0 && <Unit value={days} label="days" />}
                            <Unit value={hours} label="hours" />
                            <Unit value={minutes} label="min" />
                            <Unit value={seconds} label="sec" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuctionNotStarted;
