import ErrorState from "../components/ErrorState";
import { useEffect, useState } from "react";
import { CalendarDays, Clock, Gavel, ArrowRight } from "lucide-react";
import { useGetAssignedAuctionsQuery } from "../api/auctionApi";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import StatusPill from "../components/StatusPill";
import EmptyState from "../components/EmptyState";

const ACCENT = {
    active: "bg-emerald-500",
    scheduled: "bg-gold-400",
    paused: "bg-orange-400",
    waiting: "bg-sky-400",
    completed: "bg-slate-300",
};

const dateOf = (value) => new Date(value).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const timeOf = (value) => new Date(value).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

// "Opens in 2d 4h 10m" until the start time, refreshed every 30 seconds
const OpensIn = ({ startTime }) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(id);
    }, []);
    const distance = new Date(startTime).getTime() - now;
    if (distance <= 0) return <span>Opening any moment</span>;
    const days = Math.floor(distance / 86400000);
    const hours = Math.floor((distance % 86400000) / 3600000);
    const minutes = Math.floor((distance % 3600000) / 60000);
    return <span>Opens in {days > 0 ? `${days}d ` : ""}{hours}h {minutes}m</span>;
};

const AuctionCard = ({ auction }) => {
    const navigate = useNavigate();
    return (
        <button
            type="button"
            onClick={() => navigate(`/assignedAuctions/${auction.auctionId}`)}
            className="group h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
        >
            <div className={`h-1.5 ${ACCENT[auction.status] || "bg-slate-300"}`} />
            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-navy-900">{auction.name || "Auction"}</h2>
                        <p className="mt-0.5 text-sm text-slate-500">Season {auction.season || "—"}</p>
                    </div>
                    <StatusPill value={auction.status} />
                </div>
                <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        <dd>{dateOf(auction.startTime)}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <dd>
                            {timeOf(auction.startTime)} – {timeOf(auction.endTime)}
                        </dd>
                    </div>
                    <div className="flex items-center gap-2">
                        <Gavel className="h-4 w-4 text-slate-400" />
                        <dd>Round {auction.currentRound ?? 1}</dd>
                    </div>
                </dl>
                <div className="mt-4 flex items-center justify-between text-sm font-medium text-navy-700">
                    <span className="text-slate-500">{auction.status === "scheduled" && <OpensIn startTime={auction.startTime} />}</span>
                    <span className="flex items-center gap-1 group-hover:underline">
                        {auction.status === "completed" ? "View" : "Open controls"} <ArrowRight className="h-4 w-4" />
                    </span>
                </div>
            </div>
        </button>
    );
};

const AuctionsDisplay = () => {
    const { user } = useSelector((state) => state.auth);
    const { data, isLoading, isError, error, refetch } = useGetAssignedAuctionsQuery({ auctioneerId: user._id });

    useEffect(() => {
        const interval = setInterval(() => refetch(), 10000);
        return () => clearInterval(interval);
    }, [refetch]);

    return (
        <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-4 py-8">
            <div className="mb-6">
                <h1 className="font-display text-3xl font-bold tracking-tight text-navy-900">Assigned auctions</h1>
                <p className="mt-1 text-sm text-slate-500">Auctions run on their own clock. Open one to step in: pause, skip a player, undo a bid or finish early.</p>
            </div>
            {isLoading ? (
                <p className="py-16 text-center text-slate-500">Loading…</p>
            ) : isError ? (
                <ErrorState inline error={error} what="auctions" onRetry={() => refetch()} />
            ) : !data?.length ? (
                <EmptyState icon={Gavel} title="No auctions assigned yet" hint="When an admin assigns you to an auction it will appear here." />
            ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {data.map((auction, index) => (
                        <AuctionCard key={auction._id || index} auction={auction} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default AuctionsDisplay;
