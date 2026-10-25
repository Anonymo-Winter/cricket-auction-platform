import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import { Link, useParams } from "react-router-dom";
import { Download, Printer, Monitor, Trophy, ArrowLeft, Users as UsersIcon } from "lucide-react";
import { useGetAuctionSquadsQuery } from "../api/auctionApi.js";
import LoadSpinner from "../components/LoadSpinner.jsx";
import { formatMoney } from "../lib/money.js";
import { API_ORIGIN } from "../config.js";


const Initials = ({ name }) => (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-800 font-display text-lg font-semibold text-gold-300">
        {(name || "?")
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
    </div>
);

// Every team's squad after (or during) an auction: who they bought, for how much, and what is left. Printable.
export default function AuctionSquads() {
    const { id } = useParams();
    const { data, isLoading, isError, error, refetch } = useGetAuctionSquadsQuery(id, { refetchOnMountOrArgChange: true });

    if (isLoading) return <LoadSpinner />;
    if (isError || !data?.auction) {
        return <ErrorState error={error || { status: 404 }} what="auction" backTo="/auctions" backLabel="Back to auctions" onRetry={refetch} />;
    }

    const { auction, teams, unsold } = data;
    const sold = teams.reduce((sum, t) => sum + t.squadSize, 0);
    const spent = teams.reduce((sum, t) => sum + t.totalSpent, 0);

    return (
        <div className="mx-auto max-w-7xl p-4 md:p-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <Link to="/auctions" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 print:hidden">
                        <ArrowLeft className="h-4 w-4" /> All auctions
                    </Link>
                    <h1 className="font-display text-3xl font-semibold tracking-tight text-navy-900">{auction.name}</h1>
                    <p className="text-sm capitalize text-gray-600">
                        Season {auction.season} · {auction.status} · {sold} players sold · {formatMoney(spent)} spent
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 print:hidden">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
                    >
                        <Printer className="h-4 w-4" /> Print / save as PDF
                    </button>
                    <a
                        href={`${API_ORIGIN}/api/auction/${id}/squads.csv`}
                        className="inline-flex items-center gap-2 rounded-lg bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-700"
                    >
                        <Download className="h-4 w-4" /> Download CSV
                    </a>
                    <Link to={`/auction/${id}/screen`} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
                        <Monitor className="h-4 w-4" /> Big screen
                    </Link>
                    <Link to={`/stats/auctions?auction=${id}`} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
                        <Trophy className="h-4 w-4" /> Auction stats
                    </Link>
                </div>
            </div>

            {teams.length === 0 && <EmptyState icon={UsersIcon} title="No teams yet" hint="Teams will appear here once they register for this auction." />}

            <div className="grid gap-6 md:grid-cols-2">
                {teams.map((t) => (
                    <section key={String(t.team._id)} className="break-inside-avoid rounded-2xl border border-gray-200 bg-white p-5 shadow-sm print:shadow-none">
                        <div className="mb-4 flex items-center gap-3">
                            {t.team.logo ? <img src={t.team.logo} alt="" className="h-12 w-12 rounded-full object-contain" /> : <Initials name={t.team.name} />}
                            <div className="flex-1">
                                <h2 className="text-lg font-semibold text-gray-900">{t.team.name}</h2>
                                <p className="text-xs text-gray-500">
                                    {t.squadSize} player{t.squadSize === 1 ? "" : "s"} · {t.overseas} overseas
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs uppercase tracking-wide text-gray-500">Spent</p>
                                <p className="font-semibold text-navy-800">{formatMoney(t.totalSpent)}</p>
                                <p className="text-xs text-gray-500">Purse left {formatMoney(t.purseRemaining)}</p>
                            </div>
                        </div>
                        {t.players.length === 0 ? (
                            <EmptyState compact icon={UsersIcon} title="No players bought yet" />
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                                        <th className="py-2 font-medium">Player</th>
                                        <th className="py-2 font-medium">Role</th>
                                        <th className="py-2 text-right font-medium">Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {t.players.map((p) => (
                                        <tr key={String(p._id)} className="border-b border-gray-100 last:border-0">
                                            <td className="py-2">
                                                <span className="font-medium text-gray-900">{p.name}</span>
                                                <span className="block text-xs text-gray-500">{p.nationality}</span>
                                            </td>
                                            <td className="py-2 capitalize text-gray-700">{p.role?.replace(/-/g, " ")}</td>
                                            <td className="py-2 text-right font-medium tabular-nums">{formatMoney(p.price)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </section>
                ))}
            </div>

            {unsold.length > 0 && (
                <section className="mt-6 break-inside-avoid rounded-2xl border border-gray-200 bg-white p-5">
                    <h2 className="mb-2 text-lg font-semibold text-gray-900">Unsold ({unsold.length})</h2>
                    <p className="text-sm text-gray-700">{unsold.map((p) => `${p.name} (${formatMoney(p.basePrice)})`).join(" · ")}</p>
                </section>
            )}
        </div>
    );
}
