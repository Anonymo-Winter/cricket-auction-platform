import { useEffect } from "react";
import { formatMoney } from "../lib/money";
import { roleLabel } from "../lib/roles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Edit, LogOut, Settings, Globe, Activity } from "lucide-react";
import { useLogoutMutation, useGetCurrentUserQuery } from "../api/authApi";
import { useSelector, useDispatch } from "react-redux";
import { clearCredentials, setCredentials } from "../store/authSlice";
import { toast } from "sonner";
import getTeamThemeColor from "../lib/colorThemeUtil";

const ProfilePage = () => {
    const [logout] = useLogoutMutation();
    const dispatch = useDispatch();
    const { user: userData } = useSelector((state) => state.auth);

    // The signed-in user (team, purse, squad) is re-fetched every time this page opens, so a player won since login shows up
    const { data: freshUser } = useGetCurrentUserQuery(undefined, { refetchOnMountOrArgChange: true });
    useEffect(() => {
        if (freshUser?.user) dispatch(setCredentials(freshUser.user));
    }, [freshUser, dispatch]);

    const handleLogout = async () => {
        try {
            await logout().unwrap();
            dispatch(clearCredentials());
            toast.success("Logout successful!");
        } catch (error) {
            console.error("Logout failed:", error);
            toast.error("Logout failed. Please try again.");
        }
    };

    const user = userData || {};

    const formatCurrency = (amount) => (amount == null ? "—" : formatMoney(amount));

    const overseasCount = (user?.team?.players || []).filter((e) => e.player?.nationality && e.player.nationality.toLowerCase() !== "indian").length;
    const registrations = user?.team?.registeredAuction || [];
    const currentRegistration = registrations[registrations.length - 1];

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
            {/* Profile Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-navy-800 to-navy-600 rounded-3xl shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-navy-800/50 to-navy-600/50 backdrop-blur-sm"></div>
                <div className="relative p-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6 flex-col sm:flex-row">
                            <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback>{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="space-y-2 text-center sm:text-left">
                                <h2 className="text-white text-4xl font-bold">{user.name}</h2>
                                <div className="flex items-center gap-3 justify-center sm:justify-start">
                                    {user.team && (
                                        <span className="flex items-center gap-1.5 rounded-md bg-white/15 px-2 py-0.5 text-sm font-medium text-white">
                                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: getTeamThemeColor(user.team.theme).primary }} />
                                            {user.team.name}
                                        </span>
                                    )}
                                    <Badge className="bg-green-400/20 text-white border-0">{roleLabel(user.role)}</Badge>
                                    {user.auctionStatus?.isActive && (
                                        <Badge className="bg-yellow-400/20 text-white border-0">In Auction</Badge>
                                    )}
                                </div>
                                <p className="text-gray-200">{user.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <DropdownMenu>
                                <DropdownMenuTrigger>
                                    <Settings className="text-white cursor-pointer size-6" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-40">
                                    <DropdownMenuItem className="cursor-pointer">
                                        <Edit className="size-4 mr-2" /> Edit Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="cursor-pointer text-red-500" onClick={handleLogout}>
                                        <LogOut className="size-4 mr-2" /> Logout
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </div>

            {user.role === "user" && (
            <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                    {
                        title: "Purse Balance",
                        value: formatCurrency(currentRegistration?.purseRemaining),
                        icon: <Wallet className="size-6 text-green-600" />,
                        desc: currentRegistration ? "Left in your latest auction" : "Not registered in an auction yet",
                    },
                    {
                        title: "Overseas players",
                        value: String(overseasCount),
                        icon: <Globe className="size-6 text-navy-700" />,
                        desc: "In your current squad",
                    },
                    {
                        title: "Auction Status",
                        value: user.auctionStatus?.isActive ? "Bidding" : currentRegistration ? "Registered" : "Not registered",
                        icon: <Activity className="size-6 text-yellow-600" />,
                        desc: `${user.team?.players?.length || 0} ${user.team?.players?.length === 1 ? "player" : "players"} in squad`,
                    },
                ].map((stat, index) => (
                    <Card key={index} className="bg-white">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">{stat.title}</CardTitle>
                            {stat.icon}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-gray-500 mt-1">{stat.desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            

            {/* Tab Content */}
            {(
                <Card className="bg-white">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold">Current Squad</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                            {[
                                { title: "Batsmen", filter: "batsman" },
                                { title: "Bowlers", filter: "bowler" },
                                { title: "All-Rounders", filter: "all-rounder" },
                                { title: "Wicket-keepers", filter: ["wicket-keeper-batsman", "wicket-keeper"] },
                            ].map((category, index) => {
                                const filteredPlayers = user?.team?.players?.filter(
                                    (entry) => [].concat(category.filter).includes(entry.player?.role)
                                );

                                return (
                                    <div key={index} className="space-y-4">
                                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{category.title}</h3>
                                        <div className="space-y-3">
                                            {filteredPlayers?.map((entry, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                                >
                                                    <div>
                                                        <p className="font-medium">{entry.player.name}</p>
                                                        <Badge variant="secondary" className="text-xs">
                                                            {entry.player.nationality}
                                                        </Badge>
                                                        {entry.auction?.name && (
                                                            <p className="mt-1 text-xs text-gray-500">
                                                                Won in {entry.auction.name}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600">
                                                        {formatCurrency(entry.purchasePrice)}
                                                    </p>
                                                </div>
                                            ))}
                                            {filteredPlayers?.length === 0 && (
                                                <p className="text-sm text-gray-500 italic">No players</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            
            </>
            )}
        </div>
    );
};

export default ProfilePage;
