import PlayerStatsSection from "./PlayerStatsSection.jsx";
import EmptyState from "./EmptyState";
import React from "react";
import { Wallet, Award, User, Timer } from "lucide-react";
import { Card, CardContent } from "./ui/card.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar.tsx";
import { Badge } from "./ui/badge.tsx";
import { TabsContent } from "./ui/tabs.tsx";
import { Button } from "./ui/button.tsx";
import { formatMoney } from "../lib/money.js";

const PlayerCard = ({ player }) => {
    // Base card layout for all player types
    return (
        <div className="p-4 rounded-lg transition-all duration-200 border border-gray-200 shadow-sm hover:shadow-md transform hover:scale-[1.01]">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <Avatar className="border-2 w-20 h-20 border-gray-300 bg-white overflow-hidden p-1 rounded-full flex items-center shadow-md flex-shrink-0">
                    <AvatarImage src={player.player?.image} alt={player.player?.name} />
                    <AvatarFallback className="bg-slate-50 text-navy-800 font-bold text-xl">
                        {player.player?.name?.charAt(0) || "P"}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 w-full text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start mb-2">
                        <div>
                            <h3 className="font-bold text-lg">{player.player?.name}</h3>
                            <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-start mt-2">
                                <Badge className="text-sm bg-gold-300/30 text-navy-800 px-2 py-1 border-0 hover:text-white hover:bg-navy-700">
                                    {player.player?.role}
                                </Badge>
                                <Badge className="text-sm bg-green-100 text-green-800 px-2 py-1 border-0 hover:text-white hover:bg-green-500">
                                    {player.player?.nationality}
                                </Badge>
                            </div>
                        </div>
                        <div className="text-right mt-2 sm:mt-0">
                            <p className="font-semibold text-green-600">
                                Base: {formatMoney(player.player?.basePrice)}
                            </p>
                            {player.player.currentPrice > 0 && (
                                <p className="text-sm text-navy-600">
                                    Current: {formatMoney(player.player.currentPrice)}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* {player.status !== "sold" && player.status !== "unsold" && (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 mt-3">
                                <PlayerStats label="Matches" value={player.player?.matches} />
                                <PlayerStats label="Runs" value={player.player?.battingStats?.runs} />
                                <PlayerStats label="Average" value={player.player?.battingStats?.average?.toFixed(2)} />
                                <PlayerStats label="Strike Rate" value={player.player?.battingStats?.strike_rate} />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <PlayerStats label="Centuries" value={player.player?.bcenturies} />
                                <PlayerStats label="Fifties" value={player.player?.fifties} />
                                <PlayerStats label="Fours" value={player.player?.fours} />
                                <PlayerStats label="Sixes" value={player.player?.sixes} />
                            </div>
                        </>
                    )} */}
                    <PlayerStatsSection player={player} />
                </div>
            </div>
        </div>
    );
};

const TrackPlayersByStatus = ({ auctionData }) => {
    const [showAllUpcoming, setShowAllUpcoming] = React.useState(false);
    const [showAllUnsold, setShowAllUnsold] = React.useState(false);

    const tabs = [
        { value: "sold", icon: Award, label: "Sold Players" },
        { value: "unsold", icon: Wallet, label: "Unsold Players" },
        { value: "upcoming", icon: Timer, label: "Upcoming Players" },
    ];

    return (
        <>
            {tabs.map(({ value, icon: Icon }) => {
                const filteredPlayers =
                    auctionData.players?.filter((player) => {
                        if (value === "sold") return player.status === "sold";
                        if (value === "unsold") return player.status === "unsold";
                        if (value === "upcoming") return player.status === "pending";
                        return false;
                    }) || [];

                // Limited players for upcoming tab
                const displayedPlayers =
                    value === "upcoming" && !showAllUpcoming ? filteredPlayers.slice(0, 3) : filteredPlayers;

                // Limited players for unsold tab
                const displayedUnsoldPlayers =
                    value === "unsold" && !showAllUnsold ? filteredPlayers.slice(0, 3) : filteredPlayers;

                if (value === "sold") {
                    return (
                        <TabsContent value={value} key={value}>
                            <Card className="border-none shadow-none">
                                <CardContent className="p-4 md:p-6">
                                    {auctionData.results?.length > 0 ? (
                                        <div className="space-y-4 md:space-y-6">
                                            {auctionData.results.map((bid, index) => {
                                                const player = bid.player;
                                                const team = bid.soldTo;
                                                const finalAmount = formatMoney(bid.amount);
                                                const basePrice = formatMoney(player.basePrice);

                                                return (
                                                    <div
                                                        key={index}
                                                        className="p-4 md:p-5  rounded-xl border border-gray-200 transition-all duration-200 ease-in-out transform hover:scale-[1.01]"
                                                    >
                                                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                                                            {/* Player Avatar */}
                                                            <Avatar className="w-16 h-16 md:w-20 md:h-20 border-2 border-gray-200 bg-white shadow-sm flex-shrink-0">
                                                                <AvatarImage
                                                                    src={player?.image}
                                                                    alt={player?.name}
                                                                    className="object-cover"
                                                                />
                                                                <AvatarFallback className="text-gray-500 bg-gray-100 font-bold text-xl">
                                                                    {player?.name?.charAt(0) || "P"}
                                                                </AvatarFallback>
                                                            </Avatar>

                                                            {/* Player Details */}
                                                            <div className="flex-1 w-full text-center sm:text-left">
                                                                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between">
                                                                    <div>
                                                                        <h3 className="font-bold text-lg text-gray-800">
                                                                            {player?.name}
                                                                        </h3>
                                                                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-2">
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="text-xs bg-gold-300/30 text-navy-800 border-slate-200"
                                                                            >
                                                                                {player?.role || "Role"}
                                                                            </Badge>
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="text-xs bg-green-100 text-green-700 border-green-200"
                                                                            >
                                                                                {player?.nationality || "Country"}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>

                                                                    {/* Price Details */}
                                                                    <div className="mt-2 sm:mt-0 sm:text-right">
                                                                        <div className="text-sm text-gray-600">
                                                                            <span className="font-medium">Base:</span>{" "}
                                                                            {basePrice}
                                                                        </div>
                                                                        <div className="text-sm font-bold text-green-600">
                                                                            <span className="font-medium">Final:</span>{" "}
                                                                            {finalAmount}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Team and Timestamp */}
                                                                <div className="mt-3 flex flex-wrap items-center gap-3 justify-center sm:justify-start">
                                                                    <Avatar className="w-8 h-8 md:w-10 md:h-10 border-2 border-gray-200 bg-white shadow-sm">
                                                                        <AvatarImage
                                                                            src={team?.logo}
                                                                            alt={team?.name}
                                                                            className="object-contain"
                                                                        />
                                                                        <AvatarFallback className="text-gray-500 bg-gray-50">
                                                                            {team?.name?.charAt(0) || "T"}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <span className="text-sm font-semibold text-gray-700">
                                                                        {team?.name}
                                                                    </span>
                                                                    <span className="text-xs text-gray-500 sm:ml-auto">
                                                                        {bid.timestamp
                                                                            ? new Date(
                                                                                  bid.timestamp
                                                                              ).toLocaleTimeString([], {
                                                                                  hour: "2-digit",
                                                                                  minute: "2-digit",
                                                                              })
                                                                            : "Time TBD"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {/* {value === "sold" && filteredPlayers.length > 3 && (
                                                <div className="pt-4 flex justify-center">
                                                    <Button
                                                        onClick={() => setShowAllsold(!showAllsold)}
                                                        className="bg-navy-700 hover:bg-navy-800 text-white font-medium rounded-md px-4 py-2"
                                                    >
                                                        {showAllsold
                                                            ? "Show Less"
                                                            : `Show All (${filteredPlayers.length})`}
                                                    </Button>
                                                </div>
                                            )} */}
                                        </div>
                                    ) : (
                                        <EmptyState compact icon={User} title="No players sold yet" hint="Sold players will show up here." />
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    );
                }

                if (value === "unsold") {
                    return (
                        <TabsContent key={value} value={value} className="">
                            <Card className="border-none shadow-none">
                                <CardContent className="p-4 md:p-6 border-none">
                                    {displayedUnsoldPlayers.length > 0 ? (
                                        <div className="space-y-4">
                                            {displayedUnsoldPlayers.map((player, index) => (
                                                <PlayerCard key={index} player={player} />
                                            ))}

                                            {value === "unsold" && filteredPlayers.length > 3 && (
                                                <div className="pt-4 flex justify-center">
                                                    <Button
                                                        onClick={() => setShowAllUnsold(!showAllUnsold)}
                                                        className="bg-navy-700 hover:bg-navy-800 text-white font-medium rounded-md px-4 py-2"
                                                    >
                                                        {showAllUnsold
                                                            ? "Show Less"
                                                            : `Show All (${filteredPlayers.length})`}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <EmptyState compact icon={Icon} title="No players here" hint="Players in this category will show up here." />
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    );
                }

                return (
                    <TabsContent key={value} value={value} className="">
                        <Card className="border-none shadow-none">
                            <CardContent className="p-4 md:p-6 border-none">
                                {displayedPlayers.length > 0 ? (
                                    <div className="space-y-4">
                                        {displayedPlayers.map((player, index) => (
                                            <div
                                                key={index}
                                                className="p-4 rounded-lg transition-all duration-200 border border-gray-200 shadow-sm hover:shadow-md transform hover:scale-[1.01]"
                                            >
                                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                                                    <Avatar className="border-2 w-20 h-20 border-gray-300 bg-white overflow-hidden p-1 rounded-full flex items-center shadow-md flex-shrink-0">
                                                        <AvatarImage
                                                            src={player.player?.image}
                                                            alt={player.player?.name}
                                                        />
                                                        <AvatarFallback className="bg-slate-50 text-navy-800 font-bold text-xl">
                                                            {player.player?.name?.charAt(0) || "P"}
                                                        </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex-1 w-full text-center sm:text-left">
                                                        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start mb-2">
                                                            <div>
                                                                <h3 className="font-bold text-lg">
                                                                    {player.player?.name}
                                                                </h3>
                                                                <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-start mt-2">
                                                                    <Badge className="text-sm bg-gold-300/30 text-navy-800 px-2 py-1 border-0 hover:text-white hover:bg-navy-700">
                                                                        {player.player?.role}
                                                                    </Badge>
                                                                    <Badge className="text-sm bg-green-100 text-green-800 px-2 py-1 border-0 hover:text-white hover:bg-green-500">
                                                                        {player.player?.nationality}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <div className="text-right mt-2 sm:mt-0">
                                                                <p className="font-semibold text-green-600">
                                                                    Base: {formatMoney(player.player?.basePrice)}
                                                                </p>
                                                                {player.player.currentPrice > 0 && (
                                                                    <p className="text-sm text-navy-600">
                                                                        Current: {formatMoney(player.player.currentPrice)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {value === "upcoming" && filteredPlayers.length > 3 && (
                                            <div className="pt-4 flex justify-center">
                                                <Button
                                                    onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                                                    className="bg-navy-700 hover:bg-navy-800 text-white font-medium rounded-md px-4 py-2"
                                                >
                                                    {showAllUpcoming
                                                        ? "Show Less"
                                                        : `Show All (${filteredPlayers.length})`}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <EmptyState compact icon={Icon} title="No players here" hint="Players in this category will show up here." />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                );
            })}
        </>
    );
};

export default TrackPlayersByStatus;
