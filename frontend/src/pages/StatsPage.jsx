import ErrorState from "../components/ErrorState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import ball from "../assets/ball.svg";
import bat from "../assets/bat.svg";
import { useLocation } from "react-router-dom";
import { useGetAllPlayersQuery } from "../api/playerApi.js";
import LoadSpinner from "../components/LoadSpinner.jsx";
import { Card, CardContent } from "@/components/ui/card";

const PlayerDashboard = ({ players }) => {
    const [activeTab] = useState("batting");
    const location = useLocation();

    const sortedPlayers = players;
    const topPlayer = sortedPlayers[0];

    // Format numbers with commas
    const formatNumber = (num) => num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    return (
        <div className="min-h-screen bg-gray-50 py-4 px-2 sm:px-4">
            <div className="max-w-7xl mx-auto">
                {/* Featured Player Card */}
                <Card className="mb-8 overflow-hidden rounded-xl border-0 shadow-lg">
                    <CardContent className="p-0 bg-gradient-to-r from-navy-700 to-navy-900">
                        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 gap-6">
                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <div className="absolute -left-2 -top-2 bg-white text-navy-800 font-bold rounded-full w-8 h-8 flex items-center justify-center">
                                        #1
                                    </div>
                                    <Avatar className="h-20 w-20 border-4 border-white shadow-md sm:h-24 sm:w-24">
                                        <AvatarImage src={topPlayer.image} alt={topPlayer.name} className="object-cover object-top" />
                                        <AvatarFallback className="bg-navy-900 text-xl font-bold text-gold-300">{initialsOf(topPlayer.name)}</AvatarFallback>
                                    </Avatar>
                                </div>
                                <div className="text-white">
                                    <h1 className="text-2xl sm:text-3xl font-bold">{topPlayer.name}</h1>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium">
                                            {topPlayer.role?.replace(/-/g, " ")}
                                        </span>
                                        <span className="text-sm opacity-90">{topPlayer.nationality}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/90 px-6 py-3 rounded-lg text-center shadow-md">
                                <div className="text-2xl sm:text-4xl font-bold text-navy-800">
                                    {activeTab === "batting"
                                        ? formatNumber(topPlayer.battingStats.runs)
                                        : topPlayer.bowlingStats.wickets}
                                </div>
                                <div className="text-xs sm:text-sm font-semibold text-navy-600 uppercase tracking-wider">
                                    {activeTab === "batting" ? "Career Runs" : "Total Wickets"}
                                </div>
                            </div>
                        </div>

                        {/* Stats ribbon */}
                        <div className="bg-white/10 backdrop-blur-sm py-4 overflow-x-auto">
                            <div className="flex items-center justify-center gap-6 px-4 min-w-max">
                                {activeTab === "batting" ? (
                                    <>
                                        <StatHeader
                                            value={topPlayer.battingStats.average.toFixed(2)}
                                            label="Average"
                                            highlight
                                        />
                                        <StatHeader value={topPlayer.battingStats.strike_rate} label="Strike Rate" />
                                        <StatHeader value={topPlayer.battingStats.highest_score} label="HS" highlight />
                                        <StatHeader value={formatNumber(topPlayer.battingStats.fours)} label="4s" />
                                        <StatHeader value={formatNumber(topPlayer.battingStats.sixes)} label="6s" />
                                        <StatHeader value={topPlayer.battingStats.fifties} label="50s" />
                                        <StatHeader value={topPlayer.battingStats.centuries} label="100s" highlight />
                                    </>
                                ) : (
                                    <>
                                        <StatHeader
                                            value={topPlayer.bowlingStats.average.toFixed(2)}
                                            label="Average"
                                            highlight
                                        />
                                        <StatHeader value={topPlayer.bowlingStats.economy} label="Economy" />
                                        <StatHeader
                                            value={`${topPlayer.bowlingStats.best_figures.wickets}/${topPlayer.bowlingStats.best_figures.runs}`}
                                            label="Best"
                                            highlight
                                        />
                                        <StatHeader
                                            value={formatNumber(topPlayer.bowlingStats.dot_balls)}
                                            label="Dot Balls"
                                        />
                                        <StatHeader value={topPlayer.bowlingStats.five_wickets} label="5 Wkts" />
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Players Leaderboard */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="grid grid-cols-12 bg-gray-100 p-4 font-medium text-gray-600 text-sm uppercase tracking-wider">
                        <div className="col-span-4 sm:col-span-3">Player</div>
                        <div className="col-span-8 sm:col-span-9">
                            <div className="grid grid-cols-6 sm:grid-cols-7 gap-2">
                                {activeTab === "batting" ? (
                                    <>
                                        <span className="text-center">Runs</span>
                                        <span className="text-center">Avg</span>
                                        <span className="text-center">SR</span>
                                        <span className="text-center hidden sm:block">HS</span>
                                        <span className="text-center">4s</span>
                                        <span className="text-center">6s</span>
                                        <span className="text-center">50+</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-center">Wkts</span>
                                        <span className="text-center">Avg</span>
                                        <span className="text-center">Econ</span>
                                        <span className="text-center hidden sm:block">Best</span>
                                        <span className="text-center col-span-2 sm:col-span-1">Dots</span>
                                        <span className="text-center">5W</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {sortedPlayers.slice(1).map((player, index) => (
                        <div
                            key={player._id}
                            className={`grid grid-cols-12 items-center p-4 border-b hover:bg-gray-50 transition-colors ${
                                location.pathname.includes(player._id) ? "bg-slate-50" : ""
                            }`}
                        >
                            <div className="col-span-4 sm:col-span-3 flex items-center gap-3">
                                <span className="font-bold text-gray-500 w-6 text-right">{index + 2}</span>
                                <Avatar className="h-10 w-10 border border-slate-200">
                                    <AvatarImage src={player.image} alt={player.name} className="object-cover object-top" />
                                    <AvatarFallback className="bg-navy-900 text-xs font-bold text-gold-300">{initialsOf(player.name)}</AvatarFallback>
                                </Avatar>
                                <div className="truncate">
                                    <div className="font-medium text-gray-900 truncate">{player.name}</div>
                                    <div className="truncate text-xs capitalize text-slate-500">{player.role?.replace(/-/g, " ")}</div>
                                </div>
                            </div>
                            <div className="col-span-8 sm:col-span-9">
                                <div className="grid grid-cols-6 sm:grid-cols-7 gap-2">
                                    {activeTab === "batting" ? (
                                        <>
                                            <StatCell value={formatNumber(player.battingStats.runs)} highlight />
                                            <StatCell value={player.battingStats.average.toFixed(2)} />
                                            <StatCell value={player.battingStats.strike_rate} />
                                            <StatCell
                                                value={player.battingStats.highest_score}
                                                className="hidden sm:block"
                                            />
                                            <StatCell value={formatNumber(player.battingStats.fours)} />
                                            <StatCell value={formatNumber(player.battingStats.sixes)} />
                                            <StatCell
                                                value={player.battingStats.fifties + player.battingStats.centuries}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <StatCell value={player.bowlingStats.wickets} highlight />
                                            <StatCell value={player.bowlingStats.average.toFixed(2)} />
                                            <StatCell value={player.bowlingStats.economy} />
                                            <StatCell
                                                value={`${player.bowlingStats.best_figures.wickets}/${player.bowlingStats.best_figures.runs}`}
                                                className="hidden sm:block"
                                            />
                                            <StatCell
                                                value={formatNumber(player.bowlingStats.dot_balls)}
                                                colSpan={2}
                                                className="sm:col-span-1"
                                            />
                                            <StatCell value={player.bowlingStats.five_wickets} />
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const StatHeader = ({ value, label, highlight = false }) => (
    <div className={`text-center min-w-[80px] ${highlight ? "scale-110" : ""}`}>
        <div className={`font-bold ${highlight ? "text-white text-lg" : "text-blue-100"}`}>{value}</div>
        <div className={`text-xs ${highlight ? "text-white font-medium" : "text-blue-200"}`}>{label}</div>
    </div>
);

const StatCell = ({ value, highlight = false, className = "", colSpan = 1 }) => (
    <div className={`text-center ${className}`} style={{ gridColumn: `span ${colSpan}` }}>
        <div className={`font-medium ${highlight ? "text-navy-600 font-bold" : "text-gray-700"}`}>{value}</div>
    </div>
);

const initialsOf = (name) =>
    String(name || "?")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();

const StatsPage = () => {
    const [battingRec, setBattingRec] = useState(true);
    const [bowlingRec, setBowlingRec] = useState(false);
    const [selectedStat, setSelectedStat] = useState("most-runs");

    const battersOptions = [
        { label: "Most Runs", sortBy: "most-runs" },
        { label: "Highest Score", sortBy: "highest-score" },
        { label: "Highest Average", sortBy: "highest-average" },
        { label: "Most Fifties", sortBy: "most-fifties" },
        { label: "Most Hundreds", sortBy: "most-hundreds" },
        { label: "Highest Strike Rate", sortBy: "highest-strike-rate" },
        { label: "Most Fours", sortBy: "most-fours" },
        { label: "Most Sixes", sortBy: "most-sixes" },
    ];

    const bowlersOptions = [
        { label: "Most Wickets", sortBy: "most-wickets" },
        { label: "Best Average", sortBy: "best-average" },
        { label: "Best Bowling Figures", sortBy: "best-bowling-figures" },
        { label: "Best Economy Rate", sortBy: "best-economy" },
    ];

    const {
        data: players,
        isLoading,
        isError,
        error,
    } = useGetAllPlayersQuery(
        { sortBy: selectedStat, limit: 20, sortOrder: "desc" },
        { refetchOnMountOrArgChange: true }
    );

    if (isLoading) return <LoadSpinner />;
    if (isError) return <ErrorState error={error} what="stats" backTo="/auctions" backLabel="Back to auctions" />;
    if (!players?.data?.length) return <ErrorState kind="not-found" title="No player stats yet" hint="Stats appear once players have been added." backTo="/auctions" backLabel="Back to auctions" />;

    return (
        <div className="flex flex-col lg:flex-row gap-6 p-4 sm:p-6">
            {/* Sidebar */}
            <div className="w-full lg:w-64 flex-shrink-0">
                <div className="bg-white rounded-xl shadow-sm sticky top-6 overflow-hidden">
                    {/* Batting Section */}
                    <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setBattingRec(!battingRec)}
                    >
                        <div className="flex items-center gap-3">
                            <img src={bat} alt="bat" className="w-5 h-5 opacity-80" />
                            <span className="font-semibold text-gray-800">Batting Records</span>
                        </div>
                        {battingRec ? (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                    </div>
                    {battingRec && (
                        <div className="divide-y divide-gray-100">
                            {battersOptions.map((item) => (
                                <div
                                    key={item.sortBy}
                                    onClick={() => setSelectedStat(item.sortBy)}
                                    className={`cursor-pointer px-4 py-3 text-sm font-medium transition-colors ${
                                        selectedStat === item.sortBy
                                            ? "bg-slate-50 text-navy-600 border-l-4 border-blue-600"
                                            : "text-gray-700 hover:bg-gray-50"
                                    }`}
                                >
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Bowling Section */}
                    <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors border-t border-gray-100"
                        onClick={() => setBowlingRec(!bowlingRec)}
                    >
                        <div className="flex items-center gap-3">
                            <img src={ball} alt="ball" className="w-5 h-5 opacity-80" />
                            <span className="font-semibold text-gray-800">Bowling Records</span>
                        </div>
                        {bowlingRec ? (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                    </div>
                    {bowlingRec && (
                        <div className="divide-y divide-gray-100">
                            {bowlersOptions.map((item) => (
                                <div
                                    key={item.sortBy}
                                    onClick={() => setSelectedStat(item.sortBy)}
                                    className={`cursor-pointer px-4 py-3 text-sm font-medium transition-colors ${
                                        selectedStat === item.sortBy
                                            ? "bg-slate-50 text-navy-600 border-l-4 border-blue-600"
                                            : "text-gray-700 hover:bg-gray-50"
                                    }`}
                                >
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
                <PlayerDashboard players={players?.data} />
            </div>
        </div>
    );
};

export default StatsPage;
