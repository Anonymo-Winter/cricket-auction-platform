import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGetAuctionByIdQuery } from "../api/auctionApi";
import { format } from "date-fns";

// shadcn/ui components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import { Search, Users } from "lucide-react";
import { toast } from "sonner";
import { useRegisterToAuctionMutation } from "../api/auctionApi";
import { useDispatch, useSelector } from "react-redux";
import { useGetCurrentUserQuery } from "../api/authApi.js";
import { clearCredentials, setCredentials } from "../store/authSlice.js";
import { formatMoney } from "../lib/money";

const AuctionDetails = () => {
    const { auctionId } = useParams();
    const { data: auction, isLoading, error: loadError, refetch: reloadAuction } = useGetAuctionByIdQuery(auctionId, {
        refetchOnMountOrArgChange: true,
    });

    const dispatch = useDispatch();
    const { data, error, refetch } = useGetCurrentUserQuery();

    useEffect(() => {
        if (data) {
            dispatch(setCredentials(data.user));
        }
        if (error) {
            dispatch(clearCredentials());
        }
    }, [data, error, dispatch]);

    const { user } = useSelector((state) => state.auth);

    const [isRegistered, setIsRegistered] = useState(false);

    const navigate = useNavigate();
    const [registerToAuction] = useRegisterToAuctionMutation();

    const [activeTab, setActiveTab] = useState("players");
    const [playerPage, setPlayerPage] = useState(1);
    const [teamPage, setTeamPage] = useState(1);
    const [playerSearch, setPlayerSearch] = useState("");
    const [teamSearch, setTeamSearch] = useState("");
    const [playerFilter, setPlayerFilter] = useState("all");
    const pageSize = 10;

    useEffect(() => {
        if (!auction || !user) return;

        const registeredAuctions = user?.team?.registeredAuction || [];
        const isRegisteredToAuction = registeredAuctions.some((entry) => entry.auctionId.toString() === auction._id);

        setIsRegistered(isRegisteredToAuction);
    }, [auction, user, refetch, dispatch]);

    if (isLoading) {
        return (
            <div className="min-h-[calc(100vh-4rem)]  flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="text-sm text-muted-foreground">Loading auction details...</p>
                </div>
            </div>
        );
    }

    if (!auction || loadError) {
        return <ErrorState error={loadError || { status: 404 }} what="auction" backTo="/auctions" backLabel="Back to auctions" onRetry={reloadAuction} />;
    }
    // if (auction?.status != "scheduled") {
    //     return (
    //         <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center h-64">
    //             <div className="text-center">
    //                 <h3 className="text-lg font-semibold">Auction is already started</h3>
    //                 <p className="text-sm text-muted-foreground mt-2">The auction no longer accepting registrations.</p>
    //                 <Button
    //                     className="bg-navy-900 hover:bg-navy-800 cursor-pointer"
    //                     onClick={() => navigate(`/auction/${auction._id}`)}
    //                 >
    //                     view details
    //                 </Button>
    //             </div>
    //         </div>
    //     );
    // }

    // Filter and paginate players
    const filteredPlayers = auction.players.filter((player) => {
        const matchesSearch = player.player.name.toLowerCase().includes(playerSearch.toLowerCase());
        const matchesFilter = playerFilter === "all" || player.status === playerFilter;
        return matchesSearch && matchesFilter;
    });

    const paginatedPlayers = filteredPlayers.slice((playerPage - 1) * pageSize, playerPage * pageSize);

    // Filter and paginate teams
    const filteredTeams = auction.teams.filter((team) => {
        const matchesSearch = team.team.name.toLowerCase().includes(teamSearch.toLowerCase());
        return matchesSearch;
    });

    const paginatedTeams = filteredTeams.slice((teamPage - 1) * pageSize, teamPage * pageSize);

    // Calculate auction timeline status
    const now = new Date();
    const isUpcoming = now < new Date(auction.startTime);
    const isLive = now >= new Date(auction.startTime) && now <= new Date(auction.endTime);
    const isCompleted = now > new Date(auction.endTime);

    const statusToClassNames = {
        sold: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        current: "bg-gold-300/30 text-navy-800 dark:bg-blue-900 dark:text-blue-200",
        unsold: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        pending: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    };

    // Calculate auction progress percentage
    const calculateProgress = () => {
        if (isCompleted) return 100;
        if (!isLive) return 0;

        const start = new Date(auction.startTime).getTime();
        const end = new Date(auction.endTime).getTime();
        const current = now.getTime();

        return Math.min(100, Math.max(0, ((current - start) / (end - start)) * 100));
    };

    const progress = calculateProgress();

    const handleRegisterToAuction = async () => {
        try {
            const res = await registerToAuction({ auctionId: auction._id, teamId: user?.team?._id });
            if (res.error) throw new Error(res.error?.data?.message);
            else if (res?.data?.success) {
                const { data } = refetch();
                if (data?.user) {
                    dispatch(setCredentials(data.user));
                }
                setIsRegistered(true);
                toast.success(res?.data?.message);
            }
        } catch (error) {
            toast.error(error?.message);
        }
    };

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 space-y-6 bg-slate-50">
            {/* Auction Header */}
            <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <CardTitle className="font-display text-2xl font-semibold tracking-tight text-navy-900 md:text-3xl">
                                {auction.name} - Season {auction.season}
                            </CardTitle>
                            <CardDescription className="mt-2">
                                <Badge
                                    variant={isUpcoming ? "secondary" : isLive ? "success" : "outline"}
                                    className="text-xs bg-gold-300/30"
                                >
                                    {isUpcoming ? "Upcoming" : isLive ? "Live" : "Completed"}
                                </Badge>
                            </CardDescription>
                        </div>
                        {user?.role === "user" && (
                            <>
                                {isUpcoming && !isRegistered && (
                                    <Button className="w-full md:w-auto" onClick={handleRegisterToAuction}>
                                        Register for Auction
                                    </Button>
                                )}

                                {isRegistered && (
                                    <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
                                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">Registered</span>
                                        {isLive && (
                                            <Button
                                                className="bg-navy-900 hover:bg-navy-800 cursor-pointer"
                                                onClick={() => navigate(`/auction/${auction._id}`)}
                                            >
                                                Join live
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Auction Timeline */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">
                                {format(new Date(auction.startTime), "MMM d, yyyy h:mm a")}
                            </span>
                            <span className="text-sm text-muted-foreground ">
                                {format(new Date(auction.endTime), "MMM d, yyyy h:mm a")}
                            </span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Badge variant="outline" className="font-medium border-gray-300">
                                    Auction Progress
                                </Badge>
                                <span className="text-xs font-medium">
                                    {isCompleted ? "Completed" : isLive ? "In Progress" : "Not Started"}
                                </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </div>
                    </div>

                    <Separator />

                    {/* Auction Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-white border border-slate-200">
                            <CardContent className="pt-6">
                                <div className="text-sm text-muted-foreground mb-1">Minimum Bid Increment</div>
                                <div className="text-xl font-semibold">
                                    {formatMoney(auction.settings.minBidIncrement)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border border-slate-200">
                            <CardContent className="pt-6">
                                <div className="text-sm text-muted-foreground mb-1">Team Purse</div>
                                <div className="text-xl font-semibold">
                                    {formatMoney(auction.settings.maxPursePerTeam)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border border-slate-200">
                            <CardContent className="pt-6">
                                <div className="text-sm text-muted-foreground mb-1">Squad Size</div>
                                <div className="text-xl font-semibold">
                                    {auction.settings.minSquadSize}-{auction.settings.maxSquadSize} Players
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs Section */}
            <Card className="shadow-md overflow-hidden border border-slate-200">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="border-b px-6 py-2">
                        <TabsList className="grid w-full md:w-60 grid-cols-2 bg-gold-300/30">
                            <TabsTrigger value="players">Players</TabsTrigger>
                            <TabsTrigger value="teams">Teams</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="players" className="p-0">
                        <div className="p-6">
                            {/* Search and Filter */}
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search players..."
                                        className="pl-8 border border-slate-200"
                                        value={playerSearch}
                                        onChange={(e) => setPlayerSearch(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm">Filter:</span>
                                    <Select value={playerFilter} onValueChange={setPlayerFilter}>
                                        <SelectTrigger className="w-32 border border-slate-200">
                                            <SelectValue placeholder="All Players" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="all">All Players</SelectItem>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="current">Current</SelectItem>
                                                <SelectItem value="sold">Sold</SelectItem>
                                                <SelectItem value="unsold">Unsold</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Players Table */}
                            <div className="rounded-md border">
                                <Table className="border border-gray-200">
                                    <TableHeader>
                                        <TableRow className="bg-navy-900 text-white text-center hover:bg-navy-900">
                                            <TableHead className="text-white text-center">Player</TableHead>
                                            <TableHead className="text-white text-center">Type</TableHead>
                                            <TableHead className="text-white text-center">Base Price</TableHead>
                                            <TableHead className="text-white text-center">Status</TableHead>
                                            <TableHead className="text-white text-center">Sold Price</TableHead>
                                            <TableHead className="text-white text-center">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedPlayers.length > 0 ? (
                                            paginatedPlayers.map((player) => (
                                                <TableRow key={player.player._id} className="">
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center justify-center">
                                                            <Avatar className="h-8 w-8 mr-3">
                                                                <AvatarImage
                                                                    src={player.player.image || "/default-player.png"}
                                                                    alt={player.player.name}
                                                                />
                                                                <AvatarFallback>
                                                                    {player.player.name.charAt(0)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span>{player.player.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="capitalize text-center">
                                                        {player.player.role}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {formatMoney(player.player.basePrice)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge
                                                            variant="outline"
                                                            className={statusToClassNames[player.status]}
                                                        >
                                                            {player.status.charAt(0).toUpperCase() +
                                                                player.status.slice(1)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {player.status === "sold"
                                                            ? (() => {
                                                                  const soldRecord = auction.results.find(
                                                                      (r) => r.player._id === player.player._id
                                                                  );
                                                                  return soldRecord ? (
                                                                      <span className="font-medium">
                                                                          ₹
                                                                          {(
                                                                              soldRecord.amount / 100000
                                                                          ).toLocaleString()}{" "}
                                                                          Lakh
                                                                      </span>
                                                                  ) : (
                                                                      "-"
                                                                  );
                                                              })()
                                                            : "-"}
                                                    </TableCell>
                                                    <TableCell className="flex justify-center">
                                                        <Button
                                                            className="bg-navy-700 text-white hover:bg-navy-800"
                                                            onClick={() => navigate(`/player/${player.player._id}`)}
                                                        >
                                                            More Info
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5}>
                                                    <EmptyState compact icon={Users} title="No players found" hint="Try a different search or filter." />
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {filteredPlayers.length > 0 && (
                                <div className="mt-4 flex justify-center">
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    onClick={() => setPlayerPage((prev) => Math.max(1, prev - 1))}
                                                    className={playerPage === 1 ? "pointer-events-none opacity-50" : ""}
                                                />
                                            </PaginationItem>

                                            {Array.from({
                                                length: Math.min(5, Math.ceil(filteredPlayers.length / pageSize)),
                                            }).map((_, i) => {
                                                const pageNumber = i + 1;
                                                return (
                                                    <PaginationItem key={i}>
                                                        <PaginationLink
                                                            isActive={pageNumber === playerPage}
                                                            onClick={() => setPlayerPage(pageNumber)}
                                                        >
                                                            {pageNumber}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                );
                                            })}

                                            {Math.ceil(filteredPlayers.length / pageSize) > 5 && (
                                                <PaginationItem>
                                                    <PaginationEllipsis />
                                                </PaginationItem>
                                            )}

                                            <PaginationItem>
                                                <PaginationNext
                                                    onClick={() =>
                                                        setPlayerPage((prev) =>
                                                            Math.min(
                                                                Math.ceil(filteredPlayers.length / pageSize),
                                                                prev + 1
                                                            )
                                                        )
                                                    }
                                                    className={
                                                        playerPage === Math.ceil(filteredPlayers.length / pageSize)
                                                            ? "pointer-events-none opacity-50"
                                                            : ""
                                                    }
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="teams" className="p-0">
                        <div className="p-6">
                            {/* Search */}
                            <div className="flex mb-6">
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search teams..."
                                        className="pl-8 border-slate-200"
                                        value={teamSearch}
                                        onChange={(e) => setTeamSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Teams Table */}
                            <div className="rounded-md border">
                                <Table className="border border-gray-200">
                                    <TableHeader>
                                        <TableRow className="bg-navy-900 text-white text-center hover:bg-navy-900">
                                            <TableHead className="text-white text-center">Team</TableHead>
                                            <TableHead className="text-white text-center">Purse Remaining</TableHead>
                                            <TableHead className="text-white text-center">Players Bought</TableHead>
                                            <TableHead className="text-white text-center">Overseas Players</TableHead>
                                            <TableHead className="text-white text-center">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedTeams.length > 0 ? (
                                            paginatedTeams.map((team) => (
                                                <TableRow key={team.team._id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center justify-center">
                                                            <Avatar className="h-8 w-8 mr-3">
                                                                <AvatarImage
                                                                    src={team.team.logo || "/default-team.png"}
                                                                    alt={team.team.name}
                                                                />
                                                                <AvatarFallback>
                                                                    {team.team.name.charAt(0)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span>{team.team.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {formatMoney(team.purseRemaining)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {team.playersAcquired}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {team.team.overseasPlayers || 0} /{" "}
                                                        {auction.settings.maxOverseasPlayers}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant={team.isActive ? "success" : "outline"}>
                                                            {team.isActive ? "Active" : "Inactive"}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5}>
                                                    <EmptyState compact icon={Users} title="No teams yet" hint="Teams appear here as they register." />
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {filteredTeams.length > 0 && (
                                <div className="mt-4 flex justify-center">
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    onClick={() => setTeamPage((prev) => Math.max(1, prev - 1))}
                                                    className={teamPage === 1 ? "pointer-events-none opacity-50" : ""}
                                                />
                                            </PaginationItem>

                                            {Array.from({
                                                length: Math.min(5, Math.ceil(filteredTeams.length / pageSize)),
                                            }).map((_, i) => {
                                                const pageNumber = i + 1;
                                                return (
                                                    <PaginationItem key={i}>
                                                        <PaginationLink
                                                            isActive={pageNumber === teamPage}
                                                            onClick={() => setTeamPage(pageNumber)}
                                                        >
                                                            {pageNumber}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                );
                                            })}

                                            {Math.ceil(filteredTeams.length / pageSize) > 5 && (
                                                <PaginationItem>
                                                    <PaginationEllipsis />
                                                </PaginationItem>
                                            )}

                                            <PaginationItem>
                                                <PaginationNext
                                                    onClick={() =>
                                                        setTeamPage((prev) =>
                                                            Math.min(
                                                                Math.ceil(filteredTeams.length / pageSize),
                                                                prev + 1
                                                            )
                                                        )
                                                    }
                                                    className={
                                                        teamPage === Math.ceil(filteredTeams.length / pageSize)
                                                            ? "pointer-events-none opacity-50"
                                                            : ""
                                                    }
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </Card>

            {/* Current Bid Section (only visible during live auction) */}
            {isLive && auction.currentPlayer && (
                <Card className="border-none shadow-md">
                    <CardHeader>
                        <CardTitle className="text-xl">Current Bid</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="bg-muted/50">
                                <CardContent className="pt-6">
                                    <div className="text-sm text-muted-foreground mb-2">Current Player</div>
                                    <div className="flex items-center">
                                        <Avatar className="h-12 w-12 mr-3">
                                            <AvatarImage
                                                src={auction.currentPlayer.image || "/default-player.png"}
                                                alt={auction.currentPlayer.name}
                                            />
                                            <AvatarFallback>{auction.currentPlayer.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{auction.currentPlayer.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Base Price: ₹
                                                {(auction.currentPlayer.basePrice / 100000).toLocaleString()} Lakh
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-muted/50">
                                <CardContent className="pt-6">
                                    <div className="text-sm text-muted-foreground mb-2">Current Bid</div>
                                    {auction.currentBid ? (
                                        <div>
                                            <p className="font-medium">
                                                {formatMoney(auction.currentBid.amount)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                By: {auction.currentBid.team.name}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500">No bids yet for this player.</p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="bg-muted/50">
                                <CardContent className="pt-6">
                                    <div className="text-sm text-muted-foreground mb-2">Time Remaining</div>
                                    <p className="font-medium">{auction.timeRemaining}s</p>
                                    <div className="mt-2">
                                        <Progress
                                            value={(auction.timeRemaining / auction.settings.bidTimeLimit) * 100}
                                            className="h-2"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AuctionDetails;
