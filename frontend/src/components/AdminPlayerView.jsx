import EmptyState from "./EmptyState";
import { useDispatch } from "react-redux";
import { setSelectedPlayer } from "../store/playerSlice.js";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import LoadingSpinner from "./LoadSpinner.jsx";
import PaginationControls from "./PaginationControl.jsx";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { ChevronDown, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useGetAllPlayersQuery } from "../api/playerApi.js";
import { formatMoney } from "../lib/money";
import ImportPlayersDialog from "./ImportPlayersDialog.jsx";
import { FileUp } from "lucide-react";

// "right-arm-medium" -> "Right arm medium"
const pretty = (text) => (text ? text.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()) : "—");

const AdminAuctionsView = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState("10");
    const [filters, setFilters] = useState({
        status: "all",
        season: "all",
        sortBy: "createdAt_desc",
        search: "",
    });
    const [showFiltersMobile, setShowFiltersMobile] = useState(false);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const queryParams = {
        page: currentPage || 1,
        limit: itemsPerPage || "10",
        status: filters.status || "",
        season: filters.season || "",
        sortBy: filters.sortBy || "",
        sortOrder: filters.sortBy.endsWith("_desc") ? "desc" : "asc",
        search: filters.search || "",
    };

    const { data, isLoading, isError, error } = useGetAllPlayersQuery(queryParams, {
        refetchOnMountOrArgChange: true,
    });

    const handleFilterChange = (newFilters) => {
        setCurrentPage(1);
        setFilters((prev) => ({ ...prev, ...newFilters }));
    };

    if (isLoading) return <LoadingSpinner />;
    if (isError) {
        console.error(error);
        return (
            <div className="text-center text-red-500">
                Error: {error.data.message || "Something went wrong. Please try again."}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-display tracking-tight text-3xl font-bold text-navy-900">Players Overview</h1>
                <div className="flex items-center gap-3">
                <ImportPlayersDialog>
                    <Button type="button" variant="outline" className="border-gray-900">
                        <FileUp className="mr-2 h-4 w-4" />
                        Import CSV
                    </Button>
                </ImportPlayersDialog>
                <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-md text-white bg-navy-900 hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-400 transition-all duration-200"
                    onClick={() => {
                        navigate("/dashboard/players/create");
                    }}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="-ml-1 mr-2 h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-nowrap">Create New Player</span>
                </button>
                </div>
            </div>
            {/* Mobile Filter Toggle */}
            <div className="mb-4 md:hidden">
                <Button onClick={() => setShowFiltersMobile(!showFiltersMobile)} className="w-full relative">
                    {showFiltersMobile ? "Hide Filters" : "Show Filters"}
                    <ChevronDown
                        className={cn(
                            "h-4 w-4 absolute right-3 transition-transform",
                            showFiltersMobile && "-rotate-180"
                        )}
                    />
                </Button>
            </div>

            <div
                className={cn(
                    "mb-6 bg-white p-2 rounded flex flex-col md:flex-row flex-wrap gap-4 transition-all duration-300 overflow-hidden",
                    !showFiltersMobile && "hidden md:flex"
                )}
            >
                <Input
                    placeholder="Search Players"
                    className="w-full md:w-auto flex-grow border-slate-300 shadow-md shadow-gray-100"
                    value={filters.search}
                    onChange={(e) => handleFilterChange({ search: e.target.value })}
                />

                <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange({ sortBy: value })}>
                    <SelectTrigger className="w-full md:w-auto border-slate-300 shadow-md shadow-gray-100">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="name">Name (A-Z)</SelectItem>
                        <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                        <SelectItem value="createdAt">Created (oldest first)</SelectItem>
                        <SelectItem value="createdAt_desc">Created (newest first)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {data?.data?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data?.data?.map((player) => {
                        const bowls = player?.bowlingStyle && player.bowlingStyle !== "none";
                        const initials = (player?.name || "?")
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase();
                        const stats = [
                            ["Matches", player?.matches ?? 0],
                            ["Runs", player?.battingStats?.runs ?? 0],
                            ["Wickets", player?.bowlingStats?.wickets ?? 0],
                            ["Base price", formatMoney(player?.basePrice)],
                        ];
                        return (
                            <Card
                                key={player._id}
                                onClick={() => {
                                    dispatch(setSelectedPlayer(player));
                                    navigate(`/dashboard/players/${player._id}`);
                                }}
                                className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                            >
                                <CardContent className="flex flex-1 flex-col p-5">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-16 w-16 rounded-xl border border-slate-200 bg-slate-100">
                                            <AvatarImage src={player?.image} alt={player?.name} className="object-cover object-top" />
                                            <AvatarFallback className="rounded-xl bg-navy-900 text-lg font-bold text-gold-300">{initials}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <h3 className="truncate text-lg font-semibold text-navy-900">{player?.name}</h3>
                                            <span className="mt-1 inline-block rounded-full bg-gold-300/40 px-2.5 py-0.5 text-xs font-semibold capitalize text-gold-600">
                                                {player?.role}
                                            </span>
                                            <span className="ml-2 text-xs text-slate-500">{player?.nationality}</span>
                                        </div>
                                    </div>
                                    <dl className="mt-5 grid grid-cols-2 gap-x-2 gap-y-3 border-t border-slate-100 pt-4 text-center sm:grid-cols-4">
                                        {stats.map(([label, value]) => (
                                            <div key={label}>
                                                <dd className="text-base font-semibold text-navy-900">{value}</dd>
                                                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
                                            </div>
                                        ))}
                                    </dl>
                                    <div className="mt-4 space-y-1 text-sm text-slate-600">
                                        <p>
                                            <span className="font-medium text-slate-700">Bats:</span> {pretty(player?.battingStyle)}
                                        </p>
                                        <p>
                                            <span className="font-medium text-slate-700">Bowls:</span> {bowls ? pretty(player.bowlingStyle) : "Does not bowl"}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <EmptyState icon={Trophy} title="No players yet" hint="Create a player, or import many at once from a CSV file.">
                    <Button type="button" onClick={() => navigate("/dashboard/players/create")}>
                        Create new player
                    </Button>
                    <ImportPlayersDialog>
                        <Button type="button" variant="outline">
                            <FileUp className="mr-2 h-4 w-4" />
                            Import from CSV
                        </Button>
                    </ImportPlayersDialog>
                </EmptyState>
            )}
            <PaginationControls
                currentPage={currentPage}
                totalPages={data?.pagination?.totalPages || 1}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage || "10"}
                onItemsPerPageChange={(value) => {
                    setItemsPerPage(value);
                    setCurrentPage(1);
                }}
            />
        </div>
    );
};

export default AdminAuctionsView;
