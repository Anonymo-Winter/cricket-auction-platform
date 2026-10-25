import EmptyState from "./EmptyState";
import { useGetAllTeamsQuery } from "../api/auctionApi";
import { useDispatch } from "react-redux";
import { setSelectedTeam } from "../store/teamSlice.js";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import LoadingSpinner from "./LoadSpinner.jsx";
import PaginationControls from "./PaginationControl.jsx";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { ChevronDown, Users } from "lucide-react";
import { formatMoney } from "../lib/money";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import getTeamThemeColor from "../lib/colorThemeUtil.js";

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

    const { data, isLoading, isError, error } = useGetAllTeamsQuery(queryParams, {
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
        <div className="bg-white">
            <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
                <h1 className="font-display tracking-tight text-3xl font-bold text-navy-900">Teams Overview</h1>
                <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-md hover:shadow-lg text-white bg-navy-900 hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-400 transition-all duration-200"
                    onClick={() => navigate("/dashboard/teams/create")}
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
                    <span className="text-nowrap">Create New Team</span>
                </button>
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
            {/* Filter Section - UI Changes ONLY */}
            <div
                className={cn(
                    "mb-6 bg-white p-2 rounded flex flex-col md:flex-row flex-wrap gap-4 transition-all duration-300 overflow-hidden",
                    !showFiltersMobile && "hidden md:flex"
                )}
            >
                <Input
                    placeholder="Search teams"
                    className="w-full md:w-auto flex-grow border border-slate-300 shadow-md shadow-gray-100"
                    value={filters.search}
                    onChange={(e) => handleFilterChange({ search: e.target.value })}
                />

                <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange({ sortBy: value })}>
                    <SelectTrigger className="w-full md:w-auto border border-slate-300 shadow-md shadow-gray-100">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-1">
                    {data?.data?.map((team) => {
                        const registrations = team?.registeredAuction || [];
                        const purse = registrations.length ? formatMoney(registrations[registrations.length - 1].purseRemaining) : "—";
                        const accent = getTeamThemeColor(team?.theme)?.primary || "#1f4190";
                        return (
                            <Card
                                key={team._id}
                                onClick={() => {
                                    dispatch(setSelectedTeam(team));
                                    navigate(`/dashboard/teams/${team._id}`);
                                }}
                                className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                            >
                                <div className="h-1.5" style={{ background: accent }} />
                                <CardContent className="flex flex-1 flex-col p-5">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-16 w-16 rounded-xl border border-slate-200 bg-white">
                                            <AvatarImage src={team?.logo} className="object-contain" />
                                            <AvatarFallback className="rounded-xl bg-navy-900 text-lg font-bold text-gold-300">
                                                {team?.shortName?.slice(0, 2)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <h3 className="truncate text-lg font-semibold text-navy-900">{team?.name}</h3>
                                            <span className="mt-1 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold tracking-wide text-slate-600">
                                                {team?.shortName}
                                            </span>
                                        </div>
                                    </div>
                                    <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                                        <div>
                                            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Current purse</dt>
                                            <dd className="mt-0.5 text-base font-semibold text-navy-900">{purse}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Overseas players</dt>
                                            <dd className="mt-0.5 text-base font-semibold text-navy-900">{team?.overseasCount ?? 0}</dd>
                                        </div>
                                    </dl>
                                    <p className="mt-4 text-sm font-medium text-navy-700 group-hover:underline">View team →</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <EmptyState icon={Users} title="No teams yet" hint="Teams are created when an owner signs up, or you can add one here.">
                    <Button type="button" onClick={() => navigate("/dashboard/teams/create")}>
                        Create new team
                    </Button>
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
