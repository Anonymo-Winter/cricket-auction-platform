import EmptyState from "./EmptyState";
import { useGetAllAuctionsQuery } from "../api/auctionApi";
import { useDispatch } from "react-redux";
import { setSelectedAuction } from "../store/auctionSlice.js";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import LoadingSpinner from "./LoadSpinner.jsx";
import PaginationControls from "./PaginationControl.jsx";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { formatMoney } from "../lib/money";
import { ArrowUpRight, Calendar, ChevronDown } from "lucide-react";
import StatusPill from "./StatusPill";
import { useNavigate } from "react-router-dom";

const STATUS_ACCENT = {
    active: "bg-emerald-500",
    scheduled: "bg-gold-400",
    paused: "bg-orange-400",
    waiting: "bg-sky-400",
    completed: "bg-slate-300",
};

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
        limit: itemsPerPage || 10,
        status: filters.status || "",
        season: filters.season || "",
        sortBy: filters.sortBy || "",
        sortOrder: filters.sortBy.endsWith("_desc") ? "desc" : "asc",
        search: filters.search || "",
    };

    const { data, isLoading, isError, error } = useGetAllAuctionsQuery(queryParams, {
        refetchOnMountOrArgChange: true,
    });

    const handleFilterChange = (newFilters) => {
        setCurrentPage(1);
        setFilters((prev) => ({ ...prev, ...newFilters }));
    };

    if (isLoading) return <LoadingSpinner />;
    if (isError) {
        console.error(error);
        return <div>Error: {error.message}</div>;
    }

    return (
        <div className="bg-white rounded-xl">
            <div className="w-full flex flex-col mb-4 justify-start items-start gap-1 md:flex-row md:justify-between ">
                {/* flex flex-col justify-start items-center mb-6 md:flex-row md:items-start md:justify- */}
                <h1 className="font-display tracking-tight text-3xl font-bold text-navy-900">Auctions Overview</h1>
                <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-md text-white bg-navy-900 hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-400 transition-all duration-200"
                    onClick={() => navigate("/dashboard/auctions/create")}
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
                    <span className="text-nowrap">Create New Auction</span>
                </button>
            </div>

            {/* Mobile Filter Toggle */}
            <div className="mb-4 md:hidden">
                <Button onClick={() => setShowFiltersMobile(!showFiltersMobile)} className="w-full relative shadow-sm">
                    {showFiltersMobile ? "Hide Filters" : "Show Filters"}
                    <ChevronDown
                        className={cn(
                            "h-4 w-4 absolute right-3 transition-transform",
                            showFiltersMobile && "-rotate-180"
                        )}
                    />
                </Button>
            </div>

            {/* Filter Section - UI Changes ONLY */}
            <div
                className={cn(
                    "mb-6 p-2 rounded flex flex-col md:flex-row flex-wrap gap-4 transition-all duration-300 overflow-hidden",
                    !showFiltersMobile && "hidden md:flex"
                )}
            >
                <Input
                    placeholder="Search Auctions"
                    className="w-full outline-none md:w-auto flex-grow shadow-sm bg-white border border-slate-300 hover:shadow-md"
                    value={filters.search}
                    onChange={(e) => handleFilterChange({ search: e.target.value })}
                />
                <Select value={filters.status} onValueChange={(value) => handleFilterChange({ status: value })}>
                    <SelectTrigger className="w-full md:w-auto bg-white border border-slate-300 shadow-sm shadow-gray-100 hover:shadow-md">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filters.season} onValueChange={(value) => handleFilterChange({ season: value })}>
                    <SelectTrigger className="w-full md:w-auto bg-white border border-slate-300 shadow-sm hover:shadow-md">
                        <SelectValue placeholder="Filter by season" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Seasons</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange({ sortBy: value })}>
                    <SelectTrigger className="w-full md:w-auto bg-white border border-slate-300 shadow-sm hover:shadow-md">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="name">Name (A-Z)</SelectItem>
                        <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                        <SelectItem value="season">Season</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="createdAt">Created (oldest first)</SelectItem>
                        <SelectItem value="createdAt_desc">Created (newest first)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Auction Cards - NO CHANGES */}
            {data?.data.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-white rounded-xl">
                    {data.data.map((auction) => (
                        <Card
                            key={auction._id}
                            onClick={() => {
                                dispatch(setSelectedAuction(auction));
                                navigate(`/dashboard/auctions/${auction._id}`);
                            }}
                            className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                        >
                            <div className={`h-1.5 ${STATUS_ACCENT[auction.status] || "bg-slate-300"}`} />
                            <CardContent className="flex flex-1 flex-col p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-navy-900">{auction.name}</h3>
                                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                                            <Calendar size={14} className="flex-none" />
                                            <span>
                                                Season {auction.season}
                                                {auction.startTime &&
                                                    ` · ${new Date(auction.startTime).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                                            </span>
                                        </p>
                                    </div>
                                    <StatusPill value={auction.status} />
                                </div>
                                <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                                    <div>
                                        <dd className="text-base font-semibold text-navy-900">{formatMoney(auction.settings?.maxPursePerTeam)}</dd>
                                        <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Purse / team</dt>
                                    </div>
                                    <div>
                                        <dd className="text-base font-semibold text-navy-900">{auction.teams?.length ?? auction.teamCount ?? 0}</dd>
                                        <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Teams</dt>
                                    </div>
                                    <div>
                                        <dd className="text-base font-semibold text-navy-900">{auction.players?.length ?? auction.playerCount ?? 0}</dd>
                                        <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Players</dt>
                                    </div>
                                </dl>
                                <p className="mt-4 flex items-center gap-1 text-sm font-medium text-navy-700 group-hover:underline">
                                    Manage auction <ArrowUpRight size={14} />
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <EmptyState icon={Calendar} title="No auctions yet" hint="Schedule your first auction to get started.">
                    <Button type="button" onClick={() => navigate("/dashboard/auctions/create")}>
                        Create new auction
                    </Button>
                </EmptyState>
            )}
            <PaginationControls
                currentPage={currentPage}
                totalPages={data?.pagination?.totalPages || 1}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={(value) => {
                    setItemsPerPage(value);
                    setCurrentPage(1);
                }}
            />
        </div>
    );
};

export default AdminAuctionsView;
