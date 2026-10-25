import { useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Settings, History, LogOut, LayoutDashboard, UserCog } from "lucide-react";
import { useLogoutMutation } from "../api/authApi";
import { useDispatch, useSelector } from "react-redux";
import { clearCredentials } from "../store/authSlice";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { roleLabel } from "../lib/roles.js";

const AvatarDropdown = () => {
    const [open, setOpen] = useState(false);

    const [logout] = useLogoutMutation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const user = useSelector((state) => state.auth.user);

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

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="p-0 rounded-full hover:bg-transparent focus-visible:ring-gold-400">
                    <Avatar className="ring-2 ring-gold-400">
                        <AvatarFallback className="bg-navy-700 font-semibold text-gold-300">
                            {user?.name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 shadow-lg rounded-lg p-2" onClick={() => setOpen(false)}>
                <DropdownMenuLabel className="font-normal">
                    <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
                    <p className="truncate text-xs text-slate-500">{user?.email}</p>
                    <span className="mt-1.5 inline-block rounded-full bg-navy-800 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gold-300">
                        {roleLabel(user?.role)}
                    </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user?.role === "admin" && (
                    <DropdownMenuItem asChild>
                        <Link to="/dashboard" className="flex gap-2">
                            <LayoutDashboard className="mr-2 size-4" />
                            Admin dashboard
                        </Link>
                    </DropdownMenuItem>
                )}
                {user?.role === "auctioneer" && (
                    <DropdownMenuItem asChild>
                        <Link to="/assignedAuctions" className="flex gap-2">
                            <UserCog className="mr-2 size-4" />
                            Assigned auctions
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex gap-2">
                        <Settings className="mr-2 size-4" />
                        My profile
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                    <History className="mr-2 size-4" /> Auction History
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 size-4" /> Logout
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default AvatarDropdown;
