import { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "../components/ui/button";
import {
    LayoutDashboard,
    Users,
    UserPlus,
    Settings,
    Clock,
    ChevronRight,
    Menu,
    X,
    Key,
    Globe,
    LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { setSelectedAuction, setFilterOption } from "../store/auctionSlice";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { setSelectedTeam } from "../store/teamSlice";
import { setSelectedPlayer } from "../store/playerSlice";
import { clearCredentials } from "../store/authSlice";
import { useLogoutMutation } from "../api/authApi";
import { toast } from "sonner";
import iplLogo from "../assets/logo.webp";

const MOBILE_BREAKPOINT = 768;
const SECTION_BEFORE = { teams: "Manage", accessctrl: "Administration" };

const Breadcrumbs = ({ selectedAuction, onBackToAuctions, activeTab, isDetail, pathId }) => {
    const selectedTeam = useSelector((state) => state.teams.selectedTeam);

    const getIcon = () => {
        switch (activeTab) {
            case "auctions":
                return <Clock className="h-4 w-4 mr-2" />;
            case "teams":
                return <Users className="h-4 w-4 mr-2" />;
            case "players":
                return <UserPlus className="h-4 w-4 mr-2" />;
            case "accessctrl":
                return <Key className="h-4 w-4 mr-2" />;
            case "settings":
                return <Settings className="h-4 w-4 mr-2" />;
            default:
                return null;
        }
    };

    const getSelectedItemName = () => {
        if (!isDetail) return null;
        // only name the item that is actually open (the store can still hold the last one that was)
        if (activeTab === "auctions" && selectedAuction && selectedAuction._id === pathId) {
            return selectedAuction.name || "Auction Details";
        }
        if (activeTab === "teams" && selectedTeam && selectedTeam._id === pathId) {
            return selectedTeam.name || "Team Details";
        }
        return null;
    };

    const selectedItemName = getSelectedItemName();

    return (
        <nav className="mb-4 flex min-h-10 items-center pl-12 text-sm text-slate-600">
            <Button
                variant="ghost"
                className="text-gray-700 hover:text-navy-900 hover:bg-gold-300/30 transition-colors duration-200"
                onClick={onBackToAuctions}
            >
                {getIcon()}
                {({ accessctrl: "Access Control" })[activeTab] || activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </Button>

            {selectedItemName && (
                <>
                    <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />
                    <span className="text-gray-900 font-semibold truncate max-w-[200px]">{selectedItemName}</span>
                </>
            )}
        </nav>
    );
};

const Sidebar = ({ isOpen, activeTab, dispatch, menuItems, setIsSidebarOpen }) => {
    const sidebarClasses = cn(
        "fixed top-0 left-0 z-40 h-screen bg-navy-950 shadow-xl transition-all duration-300 ease-in-out overflow-hidden flex flex-col",
        isOpen ? "translate-x-0 w-60" : "-translate-x-full max-w-0"
    );

    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const [logout] = useLogoutMutation();

    const handleLogout = async () => {
        try {
            await logout().unwrap();
            dispatch(clearCredentials());
            toast.success("Logout successful!");
            navigate("/login", { replace: true });
        } catch (error) {
            console.error("Logout failed:", error);
            toast.error("Could not log out. Please try again.");
        }
    };

    const handleMenuItemClick = (itemId) => {
        if (itemId !== "auctions") {
            dispatch(setSelectedAuction(null));
        }
        if (window.innerWidth < MOBILE_BREAKPOINT) {
            setIsSidebarOpen(false);
        }
    };

    return (
        <aside className={sidebarClasses}>
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
                <img src={iplLogo} alt="IPL" className="h-9 w-auto" />
                <div className="leading-tight">
                    <p className="font-display text-lg tracking-tight text-white">Auction</p>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-gold-400">Admin console</p>
                </div>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const section = SECTION_BEFORE[item.id];
                    return (
                        <div key={item.id}>
                        {section && <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-widest text-slate-500">{section}</p>}
                        <Link to={`/dashboard/${item.path}`}>
                            <Button
                                variant={activeTab === item.id ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start rounded-lg transition-colors duration-200",
                                    activeTab === item.id
                                        ? "bg-gold-400 text-navy-950 font-semibold hover:bg-gold-300"
                                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                                )}
                                onClick={() => handleMenuItemClick(item.id)}
                            >
                                <Icon className="h-5 w-5 mr-2" />
                                <span className={cn("transition-all", !isOpen && "lg:hidden")}>{item.label}</span>
                            </Button>
                        </Link>
                        </div>
                    );
                })}
            </nav>
            <div className="border-t border-white/10 p-4 space-y-1">
                <p className="px-3 pb-2 text-xs text-slate-400 truncate">
                    Signed in as <span className="font-semibold text-slate-200">{user?.name}</span>
                </p>
                <Link to="/auctions">
                    <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-white/10 hover:text-white">
                        <Globe className="h-5 w-5 mr-2" />
                        View site
                    </Button>
                </Link>
                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-300 hover:bg-red-500/10 hover:text-red-200"
                    onClick={handleLogout}
                >
                    <LogOut className="h-5 w-5 mr-2" />
                    Logout
                </Button>
            </div>
        </aside>
    );
};

const AdminDashboard = () => {
    const dispatch = useDispatch();
    const selectedAuction = useSelector((state) => state.auctions.selectedAuction);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const menuItems = useMemo(
        () => [
            { id: "dashboard", label: "Dashboard", path: "", icon: LayoutDashboard },
            { id: "teams", label: "Teams", path: "teams", icon: Users },
            { id: "players", label: "Players", path: "players", icon: UserPlus },
            { id: "auctions", label: "Auctions", path: "auctions", icon: Clock },
            { id: "accessctrl", label: "Access Control", path: "accessctrl", icon: Key },
            { id: "settings", label: "Settings", path: "settings", icon: Settings },
        ],
        []
    );

    const activeTab = useMemo(() => {
        const path = location.pathname;

        if (path.includes("/auctions/")) return "auctions";
        if (path.includes("/teams/")) return "teams";
        if (path.includes("/players/")) return "players";

        const pathParts = path.split("/");
        const lastPart = pathParts[pathParts.length - 1];

        return menuItems.find((item) => item.path === lastPart)?.id || "dashboard";
    }, [location.pathname, menuItems]);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < MOBILE_BREAKPOINT;
            setIsMobile(mobile);
            if (mobile) setIsSidebarOpen(false);
        };

        window.addEventListener("resize", handleResize);
        handleResize();

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (activeTab !== "auctions") {
            dispatch(setFilterOption({ status: "all", season: "all" }));
        }
    }, [activeTab, dispatch]);

    const handleBackToAuctions = useCallback(() => {
        dispatch(setSelectedAuction(null));
        dispatch(setSelectedTeam(null));
        dispatch(setSelectedPlayer(null));

        navigate(activeTab === "dashboard" ? "/dashboard" : `/dashboard/${activeTab}`);
    }, [dispatch, navigate, activeTab]);

    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen((prev) => !prev);
    }, []);

    return (
        <div className="min-h-screen bg-slate-100 text-gray-900">
            {isMobile && (
                <div
                    className={cn(
                        "fixed inset-0 bg-black/50 transition-opacity duration-300 z-30",
                        isSidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
                    )}
                    onClick={() => setIsSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}
            <Sidebar
                isOpen={isSidebarOpen}
                activeTab={activeTab}
                dispatch={dispatch}
                menuItems={menuItems}
                setIsSidebarOpen={setIsSidebarOpen}
            />
            <main
                className={cn(
                    "transition-all duration-300 flex-grow px-4 md:px-8",
                    !isMobile && (isSidebarOpen ? "ml-60" : "ml-0"),
                    isMobile ? "pt-16" : "pt-5"
                )}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "fixed top-4 left-4 z-50 shadow-md transition-transform duration-150",
                        "bg-navy-900 text-gold-400 hover:bg-navy-800 hover:text-gold-300",
                        !isMobile && isSidebarOpen ? "left-[15.5rem]" : ""
                    )}
                    onClick={toggleSidebar}
                    aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                >
                    {!isSidebarOpen ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
                </Button>

                <div className="max-w-7xl mx-auto">
                    <Breadcrumbs
                        selectedAuction={selectedAuction}
                        onBackToAuctions={handleBackToAuctions}
                        activeTab={activeTab}
                        isDetail={/\/(auctions|teams|players)\/(?!create)[^/]+/.test(location.pathname)}
                        pathId={location.pathname.split("/").filter(Boolean).pop()}
                    />

                    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 text-gray-800 shadow-sm md:p-6">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
