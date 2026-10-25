import ErrorState from "./ErrorState";
import { useState, useEffect } from "react";
import { Search, CalendarDays, Clock, Monitor, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useGetAuctionsQuery } from "../api/livebiddingApi";
import LoadSpinner from "./LoadSpinner";
import StatusPill from "./StatusPill";
import EmptyState from "./EmptyState";
import { Link, useNavigate } from "react-router-dom";
import { formatMoney } from "../lib/money";

const ACCENT = {
    active: "bg-emerald-500",
    scheduled: "bg-gold-400",
    paused: "bg-orange-400",
    waiting: "bg-sky-400",
    completed: "bg-slate-300",
    cancelled: "bg-red-300",
};

const LIVE = ["active", "paused", "waiting"];

const formatDate = (value) => new Date(value).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const formatTime = (value) => new Date(value).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

// "Starts in 2d 4h", "2h 10m remaining", "Ended 3 days ago"
const timeText = (auction) => {
    const now = new Date();
    const start = new Date(auction.startTime);
    const end = new Date(auction.endTime);
    if (auction.status === "scheduled" && now < start) {
        const diff = start - now;
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        if (days === 0 && hours === 0 && minutes === 0) return "Opening any moment";
        return days > 0 ? `Starts in ${days}d ${hours}h` : `Starts in ${hours}h ${minutes}m`;
    }
    if (LIVE.includes(auction.status) && now < end) {
        const diff = end - now;
        return `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m remaining`;
    }
    if (auction.status === "completed") {
        const days = Math.floor((now - end) / 86400000);
        return days > 0 ? `Ended ${days} day${days === 1 ? "" : "s"} ago` : "Ended today";
    }
    return "";
};

const AuctionCard = ({ auction }) => {
    const navigate = useNavigate();
    const [, tick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => tick((n) => n + 1), 60000);
        return () => clearInterval(id);
    }, []);

    const status = auction.status || "completed";
    const settings = auction.settings;
    const chips = settings
        ? [
              `Purse ${formatMoney(settings.maxPursePerTeam)}`,
              `Squad ${settings.minSquadSize}–${settings.maxSquadSize}`,
              `${settings.bidTimeLimit}s per player`,
              `${auction.teamCount ?? 0} team${auction.teamCount === 1 ? "" : "s"}`,
              `${auction.playerCount ?? 0} player${auction.playerCount === 1 ? "" : "s"}`,
          ]
        : [];

    let primary = { label: "Details & register", to: `/register/${auction._id}` };
    let secondary = null;
    if (LIVE.includes(status)) {
        primary = { label: "Join live", to: `/auction/${auction._id}` };
        secondary = { label: "Details", to: `/register/${auction._id}` };
    } else if (status === "completed") {
        primary = { label: "Results", to: `/auction/cpltd/${auction._id}` };
        secondary = { label: "Squads", to: `/auction/${auction._id}/squads` };
    }

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
            <div className={`h-1.5 ${ACCENT[status] || "bg-slate-300"}`} />
            <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-navy-900" title={auction.name}>
                            {auction.name || "Auction"}
                        </h2>
                        <p className="mt-0.5 text-sm text-slate-500">Season {auction.season || "—"}</p>
                    </div>
                    <StatusPill value={status} />
                </div>

                <dl className="mt-4 space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 flex-none text-slate-400" />
                        <dd>{formatDate(auction.startTime)}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 flex-none text-slate-400" />
                        <dd>
                            {formatTime(auction.startTime)} – {formatTime(auction.endTime)}
                        </dd>
                    </div>
                </dl>

                {chips.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                        {chips.map((chip) => (
                            <span key={chip} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                {chip}
                            </span>
                        ))}
                    </div>
                )}

                <div className="mt-4 flex gap-4 text-xs font-medium text-navy-700">
                    <Link to={`/auction/${auction._id}/screen`} className="flex items-center gap-1 hover:underline">
                        <Monitor className="h-3.5 w-3.5" /> Big screen
                    </Link>
                    <Link to={`/auction/${auction._id}/squads`} className="flex items-center gap-1 hover:underline">
                        <UsersIcon className="h-3.5 w-3.5" /> Squads
                    </Link>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3">
                <span className={`text-xs font-medium ${status === "active" ? "text-emerald-700" : "text-slate-500"}`}>{timeText(auction) || " "}</span>
                <div className="flex gap-2">
                    {secondary && (
                        <Button variant="outline" size="sm" onClick={() => navigate(secondary.to)}>
                            {secondary.label}
                        </Button>
                    )}
                    <Button size="sm" onClick={() => navigate(primary.to)}>
                        {primary.label}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const AuctionsDisplay = () => {
    const { data, isLoading, isError, error, refetch } = useGetAuctionsQuery(undefined);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");

    useEffect(() => {
        const interval = setInterval(() => refetch(), 10000);
        return () => clearInterval(interval);
    }, [refetch]);

    if (isLoading) {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
                <LoadSpinner size="lg" />
            </div>
        );
    }

    if (isError) {
        return <ErrorState error={error} what="auctions" onRetry={refetch} />;
    }

    const auctions = data || [];
    const term = searchTerm.trim().toLowerCase();
    const filtered = auctions.filter((a) => {
        const matchesSearch = !term || a.name?.toLowerCase().includes(term) || a.season?.toString().includes(term);
        const matchesStatus = filterStatus === "all" || a.status === filterStatus;
        return matchesSearch && matchesStatus;
    });
    const count = (statuses) => auctions.filter((a) => statuses.includes(a.status)).length;

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="font-display text-3xl font-bold tracking-tight text-navy-900">Auctions</h1>
                        <p className="mt-1 text-sm text-slate-500">Join a live auction, register your team for an upcoming one, or look back at past results.</p>
                    </div>
                    <div className="flex gap-2 text-sm">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-800">{count(LIVE)} live</span>
                        <span className="rounded-full bg-gold-300/40 px-3 py-1 font-medium text-gold-600">{count(["scheduled"])} upcoming</span>
                        <span className="rounded-full bg-slate-200 px-3 py-1 font-medium text-slate-700">{count(["completed"])} completed</span>
                    </div>
                </div>

                <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:flex-row">
                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search by name or season"
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="h-10 w-full border-slate-300 md:w-48">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="paused">Paused</SelectItem>
                            <SelectItem value="waiting">Waiting</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setSearchTerm("");
                            setFilterStatus("all");
                        }}
                    >
                        Reset
                    </Button>
                </div>

                {filtered.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((auction) => (
                            <AuctionCard key={auction._id} auction={auction} />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={Search}
                        title="No auctions found"
                        hint={searchTerm || filterStatus !== "all" ? "Nothing matches those filters. Try widening your search." : "There are no auctions yet. Check back soon."}
                    />
                )}
            </div>
        </div>
    );
};

export default AuctionsDisplay;
