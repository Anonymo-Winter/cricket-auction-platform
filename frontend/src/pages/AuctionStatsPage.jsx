import ErrorState from "../components/ErrorState";
import { Link, useSearchParams } from "react-router-dom";
import { Wallet, Users, TrendingUp, Ban } from "lucide-react";
import { useGetOverviewStatsQuery, useGetAuctionStatsQuery } from "../api/auctionApi.js";
import { useGetAuctionsQuery } from "../api/livebiddingApi.js";
import LoadSpinner from "../components/LoadSpinner.jsx";
import { formatMoney } from "../lib/money.js";

const Tile = ({ icon: Icon, label, value }) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Icon className="h-4 w-4 text-gold-600" /> {label}
        </div>
        <p className="font-display text-3xl font-semibold text-navy-900">{value}</p>
    </div>
);

const Section = ({ title, children, empty }) => (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">{title}</h2>
        {empty ? <p className="text-sm text-gray-500">Nothing to show yet.</p> : children}
    </section>
);

const Bar = ({ value, max }) => (
    <div className="h-2 w-full rounded-full bg-gray-100">
        <div className="h-2 rounded-full bg-gradient-to-r from-navy-700 to-gold-400" style={{ width: `${max ? Math.max(4, (value / max) * 100) : 0}%` }} />
    </div>
);

// What actually happened in the auctions: the biggest buys, who spent the most, what each role cost, who went unsold.
export default function AuctionStatsPage() {
    const [params, setParams] = useSearchParams();
    const auctionId = params.get("auction") || "";

    const { data: auctions } = useGetAuctionsQuery();
    const overview = useGetOverviewStatsQuery(undefined, { skip: !!auctionId, refetchOnMountOrArgChange: true });
    const single = useGetAuctionStatsQuery(auctionId, { skip: !auctionId, refetchOnMountOrArgChange: true });
    const { data, isLoading, isError, error } = auctionId ? single : overview;

    const maxSpend = data?.biggestSpenders?.[0]?.spent || 0;
    const maxRole = data?.byRole?.[0]?.total || 0;

    return (
        <div className="mx-auto max-w-7xl p-4 md:p-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="font-display text-3xl font-semibold tracking-tight text-navy-900">Auction results</h1>
                    <p className="text-sm text-gray-600">Numbers from real auctions. Player career stats are under Stats → Player stats.</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={auctionId}
                        onChange={(e) => setParams(e.target.value ? { auction: e.target.value } : {})}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                        aria-label="Choose an auction"
                    >
                        <option value="">All auctions</option>
                        {(auctions || []).map((a) => (
                            <option key={a._id} value={a._id}>
                                {a.name}
                            </option>
                        ))}
                    </select>
                    {auctionId && (
                        <Link to={`/auction/${auctionId}/squads`} className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-700">
                            Squads
                        </Link>
                    )}
                </div>
            </div>

            {isLoading && <LoadSpinner />}
            {isError && <ErrorState inline error={error} what="auction" backTo="/auctions" backLabel="Back to auctions" />}

            {data && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <Tile icon={Users} label="Players sold" value={data.totals.sold} />
                        <Tile icon={Wallet} label="Total spent" value={formatMoney(data.totals.totalSpent)} />
                        <Tile icon={TrendingUp} label="Average price" value={formatMoney(data.totals.averagePrice)} />
                        <Tile icon={Ban} label="Unsold" value={data.totals.unsold} />
                    </div>
                    {data.totals.sold > 0 && (
                        <p className="text-sm text-gray-600">
                            {data.totals.indianSold} Indian and {data.totals.overseasSold} overseas players sold.
                        </p>
                    )}

                    <div className="grid gap-6 lg:grid-cols-2">
                        <Section title="Most expensive buys" empty={data.mostExpensive.length === 0}>
                            <ol className="space-y-2">
                                {data.mostExpensive.map((s, i) => (
                                    <li key={`${s.playerId}-${i}`} className="flex items-center justify-between gap-3 text-sm">
                                        <span className="flex items-center gap-2">
                                            <span className="w-6 text-right font-semibold text-gold-600">{i + 1}</span>
                                            <span>
                                                <span className="font-medium text-gray-900">{s.player}</span>
                                                <span className="block text-xs text-gray-500">
                                                    {s.team}
                                                    {!auctionId ? ` · ${s.auction}` : ""}
                                                </span>
                                            </span>
                                        </span>
                                        <span className="font-semibold tabular-nums text-navy-800">{formatMoney(s.price)}</span>
                                    </li>
                                ))}
                            </ol>
                        </Section>

                        <Section title="Biggest spenders" empty={data.biggestSpenders.length === 0}>
                            <ul className="space-y-3">
                                {data.biggestSpenders.map((t, i) => (
                                    <li key={`${t.team}-${i}`}>
                                        <div className="mb-1 flex justify-between text-sm">
                                            <span className="font-medium text-gray-900">
                                                {t.team} <span className="text-xs text-gray-500">{t.players} players</span>
                                            </span>
                                            <span className="tabular-nums text-gray-700">{formatMoney(t.spent)}</span>
                                        </div>
                                        <Bar value={t.spent} max={maxSpend} />
                                    </li>
                                ))}
                            </ul>
                        </Section>

                        <Section title="What each role cost" empty={data.byRole.length === 0}>
                            <ul className="space-y-3">
                                {data.byRole.map((r) => (
                                    <li key={r.role}>
                                        <div className="mb-1 flex justify-between text-sm">
                                            <span className="font-medium capitalize text-gray-900">
                                                {r.role?.replace(/-/g, " ")} <span className="text-xs text-gray-500">{r.sold} sold</span>
                                            </span>
                                            <span className="tabular-nums text-gray-700">avg {formatMoney(r.average)}</span>
                                        </div>
                                        <Bar value={r.total} max={maxRole} />
                                    </li>
                                ))}
                            </ul>
                        </Section>

                        <Section title="Biggest premium over base price" empty={data.biggestPremium.length === 0}>
                            <ul className="space-y-2 text-sm">
                                {data.biggestPremium.map((s, i) => (
                                    <li key={`${s.playerId}-${i}`} className="flex items-center justify-between gap-3">
                                        <span>
                                            <span className="font-medium text-gray-900">{s.player}</span>
                                            <span className="block text-xs text-gray-500">
                                                base {formatMoney(s.basePrice)} → sold {formatMoney(s.price)}
                                            </span>
                                        </span>
                                        <span className="font-semibold text-emerald-700">+{s.premiumPercent}%</span>
                                    </li>
                                ))}
                            </ul>
                        </Section>
                    </div>

                    <Section title={`Unsold players (${data.unsoldPlayers.length})`} empty={data.unsoldPlayers.length === 0}>
                        <p className="text-sm text-gray-700">
                            {data.unsoldPlayers.map((p) => `${p.name} (${formatMoney(p.basePrice)})`).join(" · ")}
                        </p>
                    </Section>
                </div>
            )}
        </div>
    );
}
