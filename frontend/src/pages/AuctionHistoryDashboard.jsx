import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import { useEffect, useState } from "react";
import {
    ChevronDown,
    ChevronUp,
    DollarSign,
    Users,
    Globe,
    Info,
    Filter,
    Search,
    TrendingUp,
    Zap,
    Calendar,
    Download,
} from "lucide-react";
import { useGetAucionHistoryQuery } from "../api/auctionApi";
import { useParams } from "react-router-dom";
import { API_ORIGIN } from "../config.js";
import LoadSpinner from "../components/LoadSpinner";

const formatCurrency = (amount) => {
    if (amount === 0 || amount === undefined || amount === null) {
        return "₹0";
    }
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
};

const AuctionHistoryDashboard = () => {
    const [expandedTeams, setExpandedTeams] = useState({});
    const [activeTab, setActiveTab] = useState("teams");
    const [auctionData, setAuctionData] = useState({});
    const [searchTerm, setSearchTerm] = useState("");
    const [playerSearchTerm, setPlayerSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: "totalSpent", direction: "descending" });
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const [filters, setFilters] = useState({
        showTeamsWithNoPlayers: true,
    });

    const { id } = useParams();
    const { data, isloading, error, refetch } = useGetAucionHistoryQuery(id);

    useEffect(() => {
        if (data) {
            setAuctionData((prev) => ({ ...prev, ...data.auction }));
        }
    }, [data]);

    useEffect(() => {
        // Set initial expanded state for the team with highest spend
        if (auctionData?.teams?.length > 0) {
            const sortedTeams = [...auctionData.teams].sort((a, b) => (b?.totalSpent || 0) - (a?.totalSpent || 0));
            const topTeamId = sortedTeams[0]?.team?._id;
            if (topTeamId) {
                setExpandedTeams({ [topTeamId]: true });
            }
        }
    }, [auctionData?.teams]);

    const toggleTeamExpand = (teamId) => {
        setExpandedTeams((prev) => ({
            ...prev,
            [teamId]: !prev[teamId],
        }));
    };

    const requestSort = (key) => {
        let direction = "ascending";
        if (sortConfig.key === key && sortConfig.direction === "ascending") {
            direction = "descending";
        }
        setSortConfig({ key, direction });
    };

    const getFilteredTeams = () => {
        if (!auctionData?.teams) return [];

        let filteredTeams = [...auctionData.teams];

        // Filter by search term
        if (searchTerm) {
            filteredTeams = filteredTeams.filter((team) =>
                team?.team?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter out teams with no players if option is unchecked
        if (!filters.showTeamsWithNoPlayers) {
            filteredTeams = filteredTeams.filter((team) => team?.players?.length > 0);
        }

        // Sort the filtered results
        if (sortConfig.key) {
            filteredTeams.sort((a, b) => {
                // Handle nested properties
                let aValue, bValue;

                if (sortConfig.key === "name") {
                    aValue = a?.team?.name || "";
                    bValue = b?.team?.name || "";
                } else {
                    aValue = a?.[sortConfig.key] || 0;
                    bValue = b?.[sortConfig.key] || 0;
                }

                if (aValue < bValue) {
                    return sortConfig.direction === "ascending" ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === "ascending" ? 1 : -1;
                }
                return 0;
            });
        }

        return filteredTeams;
    };

    const getFilteredPlayers = () => {
        if (!auctionData?.players) return [];

        let filteredPlayers = [...auctionData.players];

        // Filter by search term
        if (playerSearchTerm) {
            filteredPlayers = filteredPlayers.filter(
                (player) =>
                    player?.player?.name?.toLowerCase().includes(playerSearchTerm.toLowerCase()) ||
                    player?.soldTo?.name?.toLowerCase().includes(playerSearchTerm.toLowerCase())
            );
        }

        // Sort the filtered results
        if (sortConfig.key) {
            filteredPlayers.sort((a, b) => {
                let aValue, bValue;

                if (sortConfig.key === "playerName") {
                    aValue = a?.player?.name || "";
                    bValue = b?.player?.name || "";
                } else if (sortConfig.key === "soldTo") {
                    aValue = a?.soldTo?.name || "";
                    bValue = b?.soldTo?.name || "";
                } else {
                    aValue = a?.[sortConfig.key] || 0;
                    bValue = b?.[sortConfig.key] || 0;
                }

                if (aValue < bValue) {
                    return sortConfig.direction === "ascending" ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === "ascending" ? 1 : -1;
                }
                return 0;
            });
        }

        return filteredPlayers;
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === "ascending" ? " ↑" : " ↓";
        }
        return "";
    };


    // Downloads every squad of this auction as a CSV (same file as the Squads page)
    const handleExportData = () => {
        window.location.assign(`${API_ORIGIN}/api/auction/${id}/squads.csv`);
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
        // In a real implementation, this would trigger fullscreen mode
    };

    // Get top spending team
    const getTopSpendingTeam = () => {
        if (!auctionData?.teams || auctionData.teams.length === 0) return null;
        return [...auctionData.teams].sort((a, b) => (b?.totalSpent || 0) - (a?.totalSpent || 0))[0];
    };

    // Get highest sale
    const getHighestSale = () => {
        if (!auctionData?.players || auctionData.players.length === 0) return null;
        return [...auctionData.players].sort((a, b) => (b?.soldPrice || 0) - (a?.soldPrice || 0))[0];
    };

    if (isloading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center p-8 max-w-md">
                    <LoadSpinner className="w-16 h-16 text-navy-600 mx-auto" />
                    <h2 className="mt-4 text-xl font-semibold text-gray-800">Loading Auction Data</h2>
                    <p className="mt-2 text-gray-600">Please wait while we fetch the latest auction results...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return <ErrorState error={error} what="auction" backTo="/auctions" backLabel="Back to auctions" onRetry={refetch} />;
    }

    // Handle no data case
    if (!auctionData || Object.keys(auctionData).length === 0) {
        return <ErrorState error={{ status: 404 }} what="auction" backTo="/auctions" backLabel="Back to auctions" />;
    }

    const topSpendingTeam = getTopSpendingTeam();
    const highestSale = getHighestSale();

    return (
        <div className={`min-h-screen bg-gray-50 ${isFullscreen ? "fixed inset-0 z-50 overflow-auto" : ""}`}>
            <div className="container mx-auto px-4 py-8 space-y-6 max-w-7xl">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-navy-700 to-navy-900 text-white rounded-xl p-8 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 bottom-0 left-0 bg-gradient-to-r from-navy-700/10 to-navy-900/10"></div>
                    <div className="relative flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-gold-300">Final results</p>
                            <h1 className="mb-2 font-display text-3xl font-bold tracking-tight md:text-4xl">{auctionData?.name || "Auction results"}</h1>
                            <p className="text-lg text-white/70">
                                <Calendar className="inline-block mr-2 h-5 w-5" />
                                {new Date(auctionData?.completedAt).toLocaleDateString("en-IN", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </p>
                        </div>
                        <div className="mt-4 md:mt-0 flex space-x-3">
                            <button
                                onClick={handleExportData}
                                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center"
                            >
                                <Download className="w-4 h-4 mr-2" /> Export Data
                            </button>
                            <button
                                onClick={toggleFullscreen}
                                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                            >
                                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                            </button>
                        </div>
                    </div>
                </div>
                {/* Auction Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-500 font-medium">Total Players Sold</h3>
                            <Users className="w-8 h-8 text-navy-600 p-1 bg-slate-50 rounded-lg" />
                        </div>
                        <p className="text-3xl font-bold text-gray-800">
                            {auctionData?.summary?.totalPlayersSold || 0}
                        </p>
                        <div className="mt-2 text-sm text-gray-500">
                            Including {auctionData?.summary?.overseasPlayersSold || 0} overseas players
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-500 font-medium">Total Amount Spent</h3>
                            <DollarSign className="w-8 h-8 text-green-600 p-1 bg-green-50 rounded-lg" />
                        </div>
                        <p className="text-3xl font-bold text-gray-800">
                            {formatCurrency(auctionData?.summary?.totalAmountSpent)}
                        </p>
                        <div className="mt-2 text-sm text-gray-500">
                            Average:{" "}
                            {formatCurrency(
                                auctionData?.summary?.totalAmountSpent / (auctionData?.summary?.totalPlayersSold || 1)
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-500 font-medium">Top Spending Team</h3>
                            <TrendingUp className="w-8 h-8 text-navy-700 p-1 bg-gold-300/20 rounded-lg" />
                        </div>
                        <p className="text-xl font-bold text-gray-800 truncate">
                            {topSpendingTeam?.team?.name || "N/A"}
                        </p>
                        <div className="mt-2 text-sm text-gray-500">
                            Spent: {formatCurrency(topSpendingTeam?.totalSpent || 0)}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-500 font-medium">Highest Sale</h3>
                            <Zap className="w-8 h-8 text-amber-500 p-1 bg-amber-50 rounded-lg" />
                        </div>
                        <p className="text-xl font-bold text-gray-800 truncate">{highestSale?.player?.name || "N/A"}</p>
                        <div className="mt-2 text-sm text-gray-500">
                            {formatCurrency(highestSale?.soldPrice || 0)} to {highestSale?.soldTo?.name || "N/A"}
                        </div>
                    </div>
                </div>
                {/* Main Content Tabs */}
                <div className="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
                    <div className="flex border-b">
                        <button
                            onClick={() => setActiveTab("teams")}
                            className={`flex-1 py-4 text-center font-semibold transition-all ${
                                activeTab === "teams"
                                    ? "bg-slate-50 text-navy-800 border-b-2 border-blue-700"
                                    : "text-gray-600 hover:bg-gray-50"
                            }`}
                        >
                            Team Purchases
                        </button>
                        <button
                            onClick={() => setActiveTab("players")}
                            className={`flex-1 py-4 text-center font-semibold transition-all ${
                                activeTab === "players"
                                    ? "bg-slate-50 text-navy-800 border-b-2 border-blue-700"
                                    : "text-gray-600 hover:bg-gray-50"
                            }`}
                        >
                            Player Sales
                        </button>
                    </div>

                    {/* Team Purchases Tab */}
                    {activeTab === "teams" && (
                        <div className="p-6">
                            <div className="mb-6 flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 md:items-center">
                                {/* Search Box */}
                                <div className="relative flex-grow max-w-md">
                                    <Search
                                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                        size={18}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search teams..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    />
                                </div>

                                {/* Filters */}
                                <div className="flex items-center space-x-4">
                                    <Filter size={18} className="text-gray-500" />
                                    <label className="inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filters.showTeamsWithNoPlayers}
                                            onChange={() =>
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    showTeamsWithNoPlayers: !prev.showTeamsWithNoPlayers,
                                                }))
                                            }
                                            className="form-checkbox h-5 w-5 text-navy-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-gray-700">Show teams with no players</span>
                                    </label>
                                </div>
                            </div>

                            {getFilteredTeams().length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 text-left">
                                                <th
                                                    className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                                                    onClick={() => requestSort("name")}
                                                >
                                                    Team{getSortIndicator("name")}
                                                </th>
                                                <th
                                                    className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-700 text-right cursor-pointer hover:bg-gray-100"
                                                    onClick={() => requestSort("playersBought")}
                                                >
                                                    Players{getSortIndicator("playersBought")}
                                                </th>
                                                <th
                                                    className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-700 text-right cursor-pointer hover:bg-gray-100"
                                                    onClick={() => requestSort("totalSpent")}
                                                >
                                                    Total Spent{getSortIndicator("totalSpent")}
                                                </th>
                                                <th
                                                    className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-700 text-right cursor-pointer hover:bg-gray-100"
                                                    onClick={() => requestSort("overseasPlayersBought")}
                                                >
                                                    Overseas{getSortIndicator("overseasPlayersBought")}
                                                </th>
                                                <th
                                                    className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-700 text-right cursor-pointer hover:bg-gray-100"
                                                    onClick={() => requestSort("purseRemaining")}
                                                >
                                                    Purse Remaining{getSortIndicator("purseRemaining")}
                                                </th>
                                                <th className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-700 text-center">
                                                    Details
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {getFilteredTeams().map((teamData) => (
                                                <>
                                                    <tr
                                                        key={teamData?.team?._id}
                                                        className={`hover:bg-gray-50 transition-colors ${
                                                            teamData?.playersBought === 0
                                                                ? "bg-gray-50 text-gray-500"
                                                                : ""
                                                        }`}
                                                    >
                                                        <td className="px-4 py-3 border-b border-gray-200 font-medium text-gray-800">
                                                            {teamData?.team?.name || "Unknown Team"}
                                                        </td>
                                                        <td className="px-4 py-3 border-b border-gray-200 text-right">
                                                            {teamData?.playersBought || 0}
                                                        </td>
                                                        <td className="px-4 py-3 border-b border-gray-200 text-right font-medium text-gray-800">
                                                            {formatCurrency(teamData?.totalSpent)}
                                                        </td>
                                                        <td className="px-4 py-3 border-b border-gray-200 text-right">
                                                            {teamData?.overseasPlayersBought || 0}
                                                        </td>
                                                        <td className="px-4 py-3 border-b border-gray-200 text-right font-medium text-gray-800">
                                                            {formatCurrency(teamData?.purseRemaining)}
                                                        </td>
                                                        <td className="px-4 py-3 border-b border-gray-200 text-center">
                                                            {teamData?.players?.length > 0 ? (
                                                                <button
                                                                    onClick={() =>
                                                                        toggleTeamExpand(teamData?.team?._id)
                                                                    }
                                                                    className="p-2 text-navy-600 hover:text-navy-800 hover:bg-slate-50 rounded-lg transition-colors"
                                                                >
                                                                    {expandedTeams[teamData?.team?._id] ? (
                                                                        <ChevronUp size={20} />
                                                                    ) : (
                                                                        <ChevronDown size={20} />
                                                                    )}
                                                                </button>
                                                            ) : (
                                                                <span className="text-sm text-gray-400">
                                                                    No players
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {expandedTeams[teamData?.team?._id] &&
                                                        teamData?.players?.length > 0 && (
                                                            <tr>
                                                                <td
                                                                    colSpan={6}
                                                                    className="p-0 border-b border-gray-200"
                                                                >
                                                                    <div className="bg-gray-50 p-4">
                                                                        <div className="mb-4 flex items-center justify-between">
                                                                            <h3 className="font-medium text-gray-800">
                                                                                Player Purchases
                                                                            </h3>
                                                                        </div>
                                                                        {(teamData?.players || []).length > 0 ? (
                                                                            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                                                                                <table className="w-full">
                                                                                    <thead>
                                                                                        <tr className="bg-gray-50">
                                                                                            <th className="px-4 py-2 border-b border-gray-200 text-left font-medium text-gray-700">
                                                                                                Player
                                                                                            </th>
                                                                                            <th className="px-4 py-2 border-b border-gray-200 text-right font-medium text-gray-700">
                                                                                                Purchase Price
                                                                                            </th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {(teamData?.players || []).map((playerData) => (
                                                                                            <tr
                                                                                                key={
                                                                                                    playerData?.player
                                                                                                        ?._id
                                                                                                }
                                                                                                className="hover:bg-gray-50 transition-colors"
                                                                                            >
                                                                                                <td className="px-4 py-3 border-b border-gray-200 font-medium text-gray-800">
                                                                                                    {playerData?.player
                                                                                                        ?.name ||
                                                                                                        "Unknown Player"}
                                                                                                </td>
                                                                                                <td className="px-4 py-3 border-b border-gray-200 text-right font-medium text-gray-800">
                                                                                                    {formatCurrency(
                                                                                                        playerData?.purchasePrice
                                                                                                    )}
                                                                                                </td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        ) : (
                                                                            <EmptyState compact icon={Users} title="No players match this filter" />
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                </>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <EmptyState compact icon={Users} title="No teams found" hint="Nothing matches your search." />
                            )}
                        </div>
                    )}

                    {/* Player Sales Tab */}
                    {activeTab === "players" && (
                        <div className="p-6">
                            <div className="mb-6 flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 md:items-center">
                                {/* Search Box */}
                                <div className="relative flex-grow max-w-md">
                                    <Search
                                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                        size={18}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search players or teams..."
                                        value={playerSearchTerm}
                                        onChange={(e) => setPlayerSearchTerm(e.target.value)}
                                        className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    />
                                </div>
                            </div>

                            {getFilteredPlayers().length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50 text-left">
                                                <th
                                                    className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                                                    onClick={() => requestSort("playerName")}
                                                >
                                                    Player{getSortIndicator("playerName")}
                                                </th>
                                                <th
                                                    className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                                                    onClick={() => requestSort("soldTo")}
                                                >
                                                    Team{getSortIndicator("soldTo")}
                                                </th>
                                                <th
                                                    className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-700 text-right cursor-pointer hover:bg-gray-100"
                                                    onClick={() => requestSort("soldPrice")}
                                                >
                                                    Price{getSortIndicator("soldPrice")}
                                                </th>
                                                <th
                                                    className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-700 text-center cursor-pointer hover:bg-gray-100"
                                                    onClick={() => requestSort("isOverseas")}
                                                >
                                                    Origin{getSortIndicator("isOverseas")}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {getFilteredPlayers().map((playerData, index) => (
                                                <tr
                                                    key={playerData?.player?._id || index}
                                                    className="hover:bg-gray-50 transition-colors"
                                                >
                                                    <td className="px-4 py-3 border-b border-gray-200 font-medium text-gray-800">
                                                        {playerData?.player?.name || "Unknown Player"}
                                                    </td>
                                                    <td className="px-4 py-3 border-b border-gray-200">
                                                        {playerData?.soldTo?.name || "Unsold"}
                                                    </td>
                                                    <td className="px-4 py-3 border-b border-gray-200 text-right font-medium text-gray-800">
                                                        {formatCurrency(playerData?.soldPrice)}
                                                    </td>
                                                    <td className="px-4 py-3 border-b border-gray-200 text-center">
                                                        {playerData?.isOverseas ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gold-300/30 text-navy-800">
                                                                <Globe className="w-3 h-3 mr-1" />
                                                                Overseas
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                                Local
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <EmptyState compact icon={Users} title="No players found" hint="Nothing matches your search." />
                            )}
                        </div>
                    )}
                </div>
                <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-200">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800 pb-2 border-b">Auction Logs</h2>

                    {auctionData?.logs?.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 text-left">
                                        <th className="border p-3">Event</th>
                                        <th className="border p-3">Player</th>
                                        <th className="border p-3">Team</th>
                                        <th className="border p-3 text-right">Amount</th>
                                        <th className="border p-3">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auctionData?.logs?.map((log, index) => (
                                        <tr
                                            key={index}
                                            className={`hover:bg-gray-50 transition-colors ${
                                                log?.event === "sold"
                                                    ? "border-l-4 border-l-green-500"
                                                    : "border-l-4 border-l-red-500"
                                            }`}
                                        >
                                            <td className="border p-3">
                                                <span
                                                    className={`inline-block px-2 py-1 text-xs rounded-full ${
                                                        log?.event === "sold"
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-red-100 text-red-700"
                                                    }`}
                                                >
                                                    {log?.event}
                                                </span>
                                            </td>
                                            <td className="border p-3 font-medium">
                                                {log?.player?.name || "Unknown Player"}
                                            </td>
                                            <td className="border p-3">{log?.team?.name || "No Team"}</td>
                                            <td className="border p-3 text-right font-medium">
                                                {formatCurrency(log?.amount)}
                                            </td>
                                            <td className="border p-3 text-gray-600">
                                                {new Date(log?.timestamp)?.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-lg p-8 text-center">
                            <Info className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                            <h3 className="text-xl font-medium text-gray-800 mb-2">No Logs Available</h3>
                            <p className="text-gray-600">There are no auction logs available for this auction.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuctionHistoryDashboard;
