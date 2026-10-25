import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { CalendarClock, CheckCircle2, Clock, PlayCircle, Plus, UserPlus, Users, Trophy, UsersRound, Radio, ShieldCheck } from "lucide-react";
import { useGetSummaryStatsQuery, useGetAllAuctionsQuery } from "../api/auctionApi.js";
import { setSelectedAuction } from "../store/auctionSlice";
import { formatMoney } from "../lib/money";

const STATUS_STYLE = {
    active: "bg-emerald-100 text-emerald-800",
    scheduled: "bg-gold-300/40 text-gold-600",
    paused: "bg-orange-100 text-orange-800",
    waiting: "bg-sky-100 text-sky-800",
    completed: "bg-slate-200 text-slate-700",
};

const StatCard = ({ title, value, hint, icon: Icon, accent }) => (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <p className="mt-1 font-display text-4xl font-bold text-navy-900">{value}</p>
                {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
                <Icon className="h-5 w-5" />
            </div>
        </div>
    </div>
);

const QuickAction = ({ icon: Icon, label, hint, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-md"
    >
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-gold-300/40 text-navy-800 group-hover:bg-gold-400">
            <Icon className="h-5 w-5" />
        </span>
        <span>
            <span className="block text-sm font-semibold text-navy-900">{label}</span>
            <span className="block text-xs text-slate-500">{hint}</span>
        </span>
    </button>
);

const fmtDate = (value) =>
    value ? new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

const AdminPanelDashboard = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { data: stats } = useGetSummaryStatsQuery(null, { refetchOnMountOrArgChange: true });
    const { data: auctionsData } = useGetAllAuctionsQuery(
        { page: 1, limit: 6, status: "", season: "", sortBy: "createdAt_desc", sortOrder: "desc", search: "" },
        { refetchOnMountOrArgChange: true }
    );
    const auctions = auctionsData?.data || [];
    const live = auctions.filter((a) => a.status === "active" || a.status === "paused" || a.status === "waiting");

    const open = (auction) => {
        dispatch(setSelectedAuction(auction));
        navigate(`/dashboard/auctions/${auction._id}`);
    };
    const num = (v) => (v ?? 0).toLocaleString();

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="font-display text-3xl font-bold tracking-tight text-navy-900">Dashboard</h1>
                    <p className="text-sm text-slate-500">Welcome back{user?.name ? `, ${user.name}` : ""}. Here is what is happening across your auctions.</p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate("/dashboard/auctions/create")}
                    className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-navy-800"
                >
                    <Plus className="h-4 w-4" /> New auction
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Live now" value={num(stats?.ongoingAuctions)} hint={`${num(stats?.auctions)} auctions in total`} icon={Radio} accent="bg-emerald-500" />
                <StatCard title="Completed" value={num(stats?.completedAuctions)} hint="Archived with full results" icon={CheckCircle2} accent="bg-slate-400" />
                <StatCard title="Teams" value={num(stats?.teams)} hint={`${num(stats?.users)} team owners`} icon={UsersRound} accent="bg-gold-400" />
                <StatCard title="Players" value={num(stats?.players)} hint={`${num(stats?.auctioneers)} auctioneers`} icon={Trophy} accent="bg-navy-600" />
            </div>

            <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Quick actions</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <QuickAction icon={CalendarClock} label="Schedule an auction" hint="Pick a preset, set the time" onClick={() => navigate("/dashboard/auctions/create")} />
                    <QuickAction icon={Users} label="Add a team" hint="Link it to an owner" onClick={() => navigate("/dashboard/teams/create")} />
                    <QuickAction icon={UserPlus} label="Add a player" hint="Or import many from a CSV" onClick={() => navigate("/dashboard/players/create")} />
                    <QuickAction icon={ShieldCheck} label="Invite someone" hint="Owners and auctioneers" onClick={() => navigate("/dashboard/accessctrl")} />
                </div>
            </section>

            {live.length > 0 && (
                <section>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Running now</h2>
                    <div className="grid gap-3 md:grid-cols-2">
                        {live.map((a) => (
                            <button
                                key={a._id}
                                type="button"
                                onClick={() => open(a)}
                                className="flex items-center justify-between rounded-xl bg-gradient-to-r from-navy-900 to-navy-700 p-4 text-left text-white shadow-md transition hover:shadow-lg"
                            >
                                <span>
                                    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gold-300">
                                        <PlayCircle className="h-4 w-4" /> {a.status}
                                    </span>
                                    <span className="mt-1 block font-display text-xl tracking-tight">{a.name}</span>
                                    <span className="text-xs text-white/70">Season {a.season}</span>
                                </span>
                                <span className="text-right text-xs text-white/70">Open controls →</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            <section>
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent auctions</h2>
                    <button type="button" onClick={() => navigate("/dashboard/auctions")} className="text-sm font-medium text-navy-700 hover:underline">
                        View all
                    </button>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {auctions.length === 0 ? (
                        <p className="p-6 text-center text-sm text-slate-500">No auctions yet. Create the first one to get started.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Auction</th>
                                    <th className="hidden px-4 py-3 sm:table-cell">Starts</th>
                                    <th className="hidden px-4 py-3 md:table-cell">Purse / team</th>
                                    <th className="px-4 py-3 text-center">Teams</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {auctions.map((a) => (
                                    <tr key={a._id} onClick={() => open(a)} className="cursor-pointer hover:bg-gold-300/10">
                                        <td className="px-4 py-3 font-medium text-navy-900">
                                            {a.name}
                                            <span className="block text-xs font-normal text-slate-500">Season {a.season}</span>
                                        </td>
                                        <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                                            <Clock className="mr-1 inline h-3.5 w-3.5 text-slate-400" />
                                            {fmtDate(a.startTime)}
                                        </td>
                                        <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{formatMoney(a.settings?.maxPursePerTeam)}</td>
                                        <td className="px-4 py-3 text-center text-slate-600">{a.teams?.length ?? a.teamCount ?? 0}</td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[a.status] || "bg-slate-100 text-slate-700"}`}>
                                                {a.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>
        </div>
    );
};

export default AdminPanelDashboard;
