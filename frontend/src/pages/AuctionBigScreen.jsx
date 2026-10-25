import ErrorState from "../components/ErrorState";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { Maximize2, Trophy, Users, Gavel, Clock, PauseCircle, Vote, ExternalLink } from "lucide-react";
import iplLogo from "../assets/logo.webp";
import { useGetAuctionTeamsSummaryQuery } from "../api/auctionApi.js";
import { useAuctionClock } from "../hooks/useAuctionClock.js";
import { useAuctionSound, useAuctionCues } from "../hooks/useAuctionSound.js";
import SoundToggle from "../components/SoundToggle.jsx";
import GoingBanner from "../components/GoingBanner.jsx";
import ResultFlash from "../components/ResultFlash.jsx";
import LoadSpinner from "../components/LoadSpinner.jsx";
import { formatMoney } from "../lib/money.js";
import { API_ORIGIN } from "../config.js";


const idOf = (v) => String(v?._id ?? v ?? "");

const Initials = ({ name, className = "" }) => (
    <div className={`flex items-center justify-center rounded-full bg-navy-700 font-display font-semibold text-gold-300 ${className}`}>
        {(name || "?")
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
    </div>
);

const PlayerPhoto = ({ player }) => {
    const [broken, setBroken] = useState(false);
    const usable = player?.image && /^(https?:|data:|\/)/.test(player.image) && !broken;
    return usable ? (
        <img src={player.image} alt={player.name} onError={() => setBroken(true)} className="h-56 w-56 rounded-3xl bg-navy-800 object-cover object-top shadow-xl" />
    ) : (
        <Initials name={player?.name} className="h-56 w-56 rounded-3xl text-7xl" />
    );
};

const StatPill = ({ label, value }) => (
    <div className="rounded-xl bg-white/10 px-4 py-2 text-center">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs uppercase tracking-wider text-white/60">{label}</p>
    </div>
);

const playerStats = (player) => {
    const bat = player?.battingStats || {};
    const bowl = player?.bowlingStats || {};
    const pills = [];
    const isBowler = player?.role === "bowler";
    if (!isBowler) {
        pills.push(["Runs", bat.runs ?? 0], ["Avg", bat.average ?? 0], ["SR", bat.strike_rate ?? 0]);
    }
    if (player?.role === "bowler" || player?.role === "all-rounder") {
        pills.push(["Wkts", bowl.wickets ?? 0], ["Econ", bowl.economy ?? 0]);
    }
    pills.push(["Matches", player?.matches ?? 0]);
    return pills;
};

const formatCountdown = (seconds) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : h > 0 ? `${h}h ${pad(m)}m ${pad(s)}s` : `${pad(m)}:${pad(s)}`;
};

// A read-only, TV-friendly view of a live auction: for a projector or a stream. Anyone can open it.
export default function AuctionBigScreen() {
    const { id } = useParams();
    const [auction, setAuction] = useState(null);
    const [currentEntry, setCurrentEntry] = useState(null);
    const [recentBids, setRecentBids] = useState([]);
    const [timer, setTimer] = useState({});
    const [poll, setPoll] = useState(null);
    const [pollSeconds, setPollSeconds] = useState(0);
    const [notFound, setNotFound] = useState(false);
    const [viewers, setViewers] = useState(0);
    const sound = useAuctionSound();
    const refetchTimer = useRef(null);

    const { data: summary, refetch: refetchTeams } = useGetAuctionTeamsSummaryQuery(id, { refetchOnMountOrArgChange: true });
    const teams = useMemo(() => summary?.teams || [], [summary]);
    const teamById = useMemo(() => new Map(teams.map((t) => [t.teamId, t])), [teams]);

    useEffect(() => {
        const socket = io(API_ORIGIN, { transports: ["websocket"], withCredentials: true, reconnection: true });
        socket.on("connect", () => socket.emit("joinAuction", id)); // runs again after every reconnect

        socket.on("initialData", (data) => {
            if (data?.error) return setNotFound(true);
            setNotFound(false);
            setAuction(data.auction);
            setCurrentEntry(data.currentPlayer || null);
            setRecentBids(data.recentBids || []);
        });
        socket.on("auctionUpdate", ({ auction: next }) => next && setAuction(next));
        socket.on("playerUpdate", ({ currentPlayer }) => {
            setCurrentEntry(currentPlayer || null);
            setRecentBids([]);
        });
        socket.on("recentBidsUpdate", ({ recentBids: bids }) => setRecentBids(bids || []));
        socket.on("bidUpdate", ({ updatedBid, placedBid }) => {
            setAuction((prev) => (prev ? { ...prev, currentBid: updatedBid } : prev));
            setRecentBids((prev) => [placedBid, ...prev].slice(0, 12));
        });
        socket.on("timerSync", (data) => setTimer({ endTime: data.endTime, serverTime: data.serverTime }));
        socket.on("userPoll", (data) => {
            setPoll(data);
            setPollSeconds(data.pollDuration);
        });
        socket.on("pollTimerUpdate", (data) => setPollSeconds(data.timeRemaining));
        socket.on("pollCompleted", () => setPoll(null));
        socket.on("viewerCount", ({ count }) => setViewers(count));
        return () => socket.disconnect();
    }, [id]);

    // purses change when a player is sold: refresh the team list shortly after any change to the results
    const soldCount = auction?.results?.length ?? 0;
    useEffect(() => {
        clearTimeout(refetchTimer.current);
        refetchTimer.current = setTimeout(() => refetchTeams(), 400);
        return () => clearTimeout(refetchTimer.current);
    }, [soldCount, auction?.status, refetchTeams]);

    const status = auction?.status;
    const player = currentEntry?.player;
    const live = (status === "active" || status === "paused") && !!player;
    const running = status === "active" && !!player;

    const clock = useAuctionClock({
        endTime: timer.endTime || auction?.timeRemaining,
        serverTime: timer.serverTime,
        running,
        frozenSeconds: status === "paused" ? auction?.pausedTimeRemaining : 0,
    });
    const startClock = useAuctionClock({ endTime: auction?.startTime, running: status === "scheduled" });
    const cueKey = idOf(auction?.currentPlayer || player);
    useAuctionCues(sound, { seconds: clock.seconds, active: running, playerKey: cueKey });

    const leader = auction?.currentBid ? teamById.get(idOf(auction.currentBid.team ?? auction.currentBid.teamId)) : null;
    const recentSales = [...(auction?.results || [])].reverse().slice(0, 6);
    const topBuys = [...(auction?.results || [])].sort((a, b) => b.amount - a.amount).slice(0, 5);
    const critical = running && clock.seconds <= 10;

    if (notFound) {
        return (
            <div className="min-h-screen bg-navy-950">
                <ErrorState dark error={{ status: 404 }} what="auction" backTo="/auctions" backLabel="Back to auctions" />
            </div>
        );
    }
    if (!auction) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-navy-950">
                <LoadSpinner />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 p-4 text-white md:p-8">
            <ResultFlash auction={auction} sound={sound} large />

            <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <img src={iplLogo} alt="" className="h-14 w-14 object-contain" />
                    <div>
                        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{auction.name}</h1>
                        <p className="text-sm text-white/60">
                            Season {auction.season} · {teams.length} {teams.length === 1 ? "team" : "teams"} · {auction.settings?.bidTimeLimit}s per player
                            {auction.currentRound > 1 ? ` · Round ${auction.currentRound}` : ""}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold capitalize">{status}</span>
                    {viewers > 0 && (
                        <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold" title="People watching right now">
                            {viewers} watching
                        </span>
                    )}
                    <SoundToggle sound={sound} className="!border-white/30 !bg-white/10 !text-white" />
                    <button
                        type="button"
                        onClick={() => document.documentElement.requestFullscreen?.()}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20"
                    >
                        <Maximize2 className="h-3.5 w-3.5" /> Full screen
                    </button>
                </div>
            </header>

            <div className="grid gap-6 lg:grid-cols-12">
                <main className="lg:col-span-8">
                    {status === "scheduled" && (
                        <section className="flex min-h-[26rem] flex-col items-center justify-center rounded-3xl bg-white/5 p-8 text-center">
                            <Clock className="mb-4 h-12 w-12 text-gold-400" />
                            <p className="text-xl text-white/70">The auction opens in</p>
                            <p className="my-4 font-mono text-7xl font-bold tabular-nums md:text-8xl">{formatCountdown(startClock.seconds)}</p>
                            <p className="text-white/60">{new Date(auction.startTime).toLocaleString()}</p>
                        </section>
                    )}

                    {live && (
                        <section className="relative rounded-3xl bg-white/5 p-6 md:p-8">
                            {status === "paused" && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-3xl bg-black/70">
                                    <PauseCircle className="mb-3 h-16 w-16 text-gold-400" />
                                    <p className="font-display text-5xl tracking-tight">Paused</p>
                                    <p className="mt-2 text-white/70">The auction will resume shortly</p>
                                </div>
                            )}
                            <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
                                <PlayerPhoto player={player} />
                                <div className="flex-1 text-center md:text-left">
                                    <p className="text-sm uppercase tracking-widest text-gold-400">
                                        {currentEntry?.set ? `${currentEntry.set} set` : "Now bidding"}
                                    </p>
                                    <h2 className="font-display text-5xl font-semibold leading-tight md:text-6xl">{player?.name}</h2>
                                    <p className="mt-1 text-xl text-white/70 capitalize">
                                        {player?.role?.replace(/-/g, " ")} · {player?.nationality}
                                    </p>
                                    <p className="mt-3 text-white/60">Base price {formatMoney(player?.basePrice)}</p>
                                    <div className="mt-4 flex flex-wrap justify-center gap-3 md:justify-start">
                                        {playerStats(player).map(([label, value]) => (
                                            <StatPill key={label} label={label} value={value} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 grid items-center gap-6 md:grid-cols-2">
                                <div className="rounded-2xl bg-black/30 p-6 text-center">
                                    <p className="text-sm uppercase tracking-widest text-white/60">
                                        {auction.currentBid?.amount ? "Current bid" : "Opening price"}
                                    </p>
                                    <p className="font-display text-6xl font-bold text-gold-400 md:text-7xl">
                                        {formatMoney(auction.currentBid?.amount || player?.basePrice)}
                                    </p>
                                    {leader ? (
                                        <div className="mt-3 flex items-center justify-center gap-3 text-2xl">
                                            {leader.logo ? (
                                                <img src={leader.logo} alt="" className="h-12 w-12 rounded-full bg-white object-contain" />
                                            ) : (
                                                <Initials name={leader.name} className="h-12 w-12 text-lg" />
                                            )}
                                            <span className="font-semibold">{leader.name}</span>
                                        </div>
                                    ) : (
                                        <p className="mt-3 text-lg text-white/50">No bids yet</p>
                                    )}
                                </div>
                                <div className={`rounded-2xl p-6 text-center ${critical ? "bg-red-600/80" : "bg-black/30"}`}>
                                    <p className="text-sm uppercase tracking-widest text-white/70">Time left</p>
                                    <p className="font-mono text-8xl font-bold tabular-nums md:text-9xl">{clock.seconds}</p>
                                    <GoingBanner seconds={clock.seconds} active={running} large />
                                </div>
                            </div>
                        </section>
                    )}

                    {status === "active" && !player && (
                        <section className="flex min-h-[26rem] flex-col items-center justify-center rounded-3xl bg-white/5 p-8 text-center">
                            <h2 className="font-display text-4xl tracking-tight">Next player coming up…</h2>
                        </section>
                    )}

                    {status === "waiting" && (
                        <section className="flex min-h-[26rem] flex-col items-center justify-center rounded-3xl bg-white/5 p-8 text-center">
                            <Vote className="mb-4 h-12 w-12 text-gold-400" />
                            {poll ? (
                                <>
                                    <h2 className="font-display text-4xl tracking-tight">Owners are voting</h2>
                                    <p className="mt-2 text-xl text-white/70">Which unsold players should come back for one more round?</p>
                                    <p className="my-4 font-mono text-8xl font-bold tabular-nums">{pollSeconds}</p>
                                    <p className="max-w-3xl text-white/60">{(poll.unsoldPlayers || []).map((p) => p.player?.name).filter(Boolean).join(" · ")}</p>
                                </>
                            ) : (
                                <h2 className="font-display text-4xl tracking-tight">Wrapping up…</h2>
                            )}
                        </section>
                    )}

                    {status === "completed" && (
                        <section className="rounded-3xl bg-white/5 p-8">
                            <div className="mb-6 flex flex-col items-center text-center">
                                <Trophy className="mb-3 h-14 w-14 text-gold-400" />
                                <h2 className="font-display text-5xl tracking-tight">Auction complete</h2>
                                <p className="mt-2 text-white/70">
                                    {auction.results?.length || 0} players sold · {formatMoney((auction.results || []).reduce((s, r) => s + (r.amount || 0), 0))} spent
                                </p>
                            </div>
                            <h3 className="mb-3 text-sm uppercase tracking-widest text-white/60">Top buys</h3>
                            <ol className="space-y-2">
                                {topBuys.map((r, i) => (
                                    <li key={`${idOf(r.player)}-${i}`} className="flex items-center justify-between rounded-xl bg-black/30 px-5 py-3 text-xl">
                                        <span>
                                            <span className="mr-3 text-gold-400">#{i + 1}</span>
                                            {r.player?.name}
                                        </span>
                                        <span className="text-white/70">
                                            {r.soldTo?.name} · <strong className="text-gold-400">{formatMoney(r.amount)}</strong>
                                        </span>
                                    </li>
                                ))}
                            </ol>
                            <div className="mt-6 text-center">
                                <Link to={`/auction/${id}/squads`} className="inline-flex items-center gap-2 rounded-full bg-gold-400 px-6 py-3 font-semibold text-navy-950 hover:bg-gold-300">
                                    See every squad <ExternalLink className="h-4 w-4" />
                                </Link>
                            </div>
                        </section>
                    )}

                    {status === "cancelled" && (
                        <section className="flex min-h-[20rem] items-center justify-center rounded-3xl bg-white/5 p-8 font-display text-4xl tracking-tight">
                            This auction was cancelled
                        </section>
                    )}
                </main>

                <aside className="space-y-6 lg:col-span-4">
                    <section className="rounded-3xl bg-white/5 p-5">
                        <h3 className="mb-3 flex items-center gap-2 text-sm uppercase tracking-widest text-white/60">
                            <Users className="h-4 w-4" /> Purses
                        </h3>
                        <ul className="space-y-2">
                            {[...teams]
                                .sort((a, b) => b.purseRemaining - a.purseRemaining)
                                .map((t) => (
                                    <li
                                        key={t.teamId}
                                        className={`flex items-center justify-between rounded-xl px-3 py-2 ${leader?.teamId === t.teamId ? "bg-gold-400/20 ring-1 ring-gold-400" : "bg-black/25"}`}
                                    >
                                        <span className="flex items-center gap-2">
                                            {t.logo ? <img src={t.logo} alt="" className="h-8 w-8 rounded-full bg-white object-contain" /> : <Initials name={t.name} className="h-8 w-8 text-xs" />}
                                            <span className="font-medium">{t.shortName || t.name}</span>
                                            <span className="text-xs text-white/50">{t.playersAcquired} players</span>
                                        </span>
                                        <span className="font-semibold tabular-nums">{formatMoney(t.purseRemaining)}</span>
                                    </li>
                                ))}
                            {teams.length === 0 && <li className="text-sm text-white/50">No teams registered yet</li>}
                        </ul>
                    </section>

                    {live && (
                        <section className="rounded-3xl bg-white/5 p-5">
                            <h3 className="mb-3 flex items-center gap-2 text-sm uppercase tracking-widest text-white/60">
                                <Gavel className="h-4 w-4" /> Latest bids
                            </h3>
                            <ul className="space-y-1.5">
                                {recentBids.slice(0, 6).map((b, i) => (
                                    <li key={`${b.timestamp}-${i}`} className="flex justify-between rounded-lg bg-black/25 px-3 py-1.5 text-sm">
                                        <span>{b.team?.shortName || b.team?.name || teamById.get(idOf(b.team))?.shortName || "Team"}</span>
                                        <span className="font-semibold text-gold-300">{formatMoney(b.amount)}</span>
                                    </li>
                                ))}
                                {recentBids.length === 0 && <li className="text-sm text-white/50">Waiting for the first bid</li>}
                            </ul>
                        </section>
                    )}

                    {recentSales.length > 0 && (
                        <section className="rounded-3xl bg-white/5 p-5">
                            <h3 className="mb-3 text-sm uppercase tracking-widest text-white/60">Recently sold</h3>
                            <ul className="space-y-1.5">
                                {recentSales.map((r, i) => (
                                    <li key={`${idOf(r.player)}-${i}`} className="flex justify-between gap-2 rounded-lg bg-black/25 px-3 py-1.5 text-sm">
                                        <span className="truncate">{r.player?.name}</span>
                                        <span className="whitespace-nowrap text-white/70">
                                            {r.soldTo?.shortName} · <strong className="text-gold-300">{formatMoney(r.amount)}</strong>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </aside>
            </div>
        </div>
    );
}
