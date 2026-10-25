import { useState } from "react";
import { ChevronDown, Menu, X, BarChart3, Gavel, UserCog, LayoutDashboard } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import AuthButtons from "./AuthButton.jsx";
import iplLogo from "../assets/logo.webp";

import AvatarDropdown from "./AvatarDropdown.jsx";

const NavBar = () => {
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const [isOpen, setIsOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [mobileDropdown, setMobileDropdown] = useState(null);
    const navItems = [
        {
            title: "AUCTION",
            path: "/auctions",
            icon: <Gavel className="w-4 h-4" />,
        },
        {
            title: "STATS",
            path: "/stats",
            icon: <BarChart3 className="w-4 h-4" />,
            dropdown: [
                { title: "Player stats", path: "/stats" },
                { title: "Auction results", path: "/stats/auctions" },
            ],
        },
    ];

    if (user?.role === "auctioneer") {
        navItems.push({ title: "ASSIGNED", path: "/assignedAuctions", icon: <UserCog className="w-4 h-4" /> });
    }
    if (user?.role === "admin") {
        navItems.push({ title: "DASHBOARD", path: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> });
    }

    return (
        <nav className="bg-navy-900 text-white border-b-2 border-gold-400/70 shadow-md print:hidden">
            {!isAuthenticated && (
                <div className="bg-navy-950 py-2">
                    <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            <span className="text-sm">IPLT20.com</span>
                            <span className="text-sm text-gray-400">|</span>
                            <span className="text-sm">The official website of IPL</span>
                        </div>
                        <AuthButtons user={isAuthenticated} />
                    </div>
                </div>
            )}
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    <div className="flex-shrink-0">
                        <NavLink to="/">
                            <img src={iplLogo} alt="IPL Logo" height={80} width={80} />
                        </NavLink>
                    </div>
                    <div className="hidden md:flex items-center space-x-4">
                        {navItems.map((item, index) => (
                            <div
                                key={index}
                                className="relative group"
                                onMouseEnter={() => setActiveDropdown(index)}
                                onMouseLeave={() => setActiveDropdown(null)}
                            >
                                <NavLink
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `flex items-center space-x-1 px-3 py-2 text-sm font-medium border-b-2 ${
                                            isActive
                                                ? "text-gold-400 border-gold-400"
                                                : "border-transparent hover:text-gold-300"
                                        }`
                                    }
                                >
                                    {item.icon}
                                    <span>{item.title}</span>
                                    {item.dropdown && <ChevronDown className="w-4 h-4" />}
                                </NavLink>
                                {item.dropdown && (
                                    <div
                                        className={`absolute left-0 w-48 bg-white rounded-md shadow-lg py-1 z-50 transition-opacity duration-200 ${
                                            activeDropdown === index ? "opacity-100" : "opacity-0 pointer-events-none"
                                        }`}
                                    >
                                        {item.dropdown.map((dropItem, idx) => (
                                            <NavLink
                                                key={idx}
                                                to={dropItem.path}
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                                {dropItem.title}
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {isAuthenticated && <AvatarDropdown />}
                    </div>
                    <div className="md:hidden flex items-center">
                        {isAuthenticated && <AvatarDropdown />}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="ms-5 text-white hover:text-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-400 rounded"
                            aria-label="Toggle menu"
                            aria-expanded={isOpen}
                        >
                            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>
            {isOpen && (
                <div className="md:hidden bg-navy-800">
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        {navItems.map((item, index) => (
                            <div key={index} className="border-b border-white/10">
                                {item.dropdown ? (
                                    <div>
                                        <button
                                            onClick={() => setMobileDropdown(mobileDropdown === index ? null : index)}
                                            className="flex items-center justify-between w-full px-3 py-2 text-base font-medium hover:bg-white/10"
                                        >
                                            <div className="flex items-center space-x-2">
                                                {item.icon}
                                                <span>{item.title}</span>
                                            </div>
                                            <ChevronDown
                                                className={`w-4 h-4 transition-transform ${
                                                    mobileDropdown === index ? "rotate-180" : ""
                                                }`}
                                            />
                                        </button>
                                        {mobileDropdown === index && (
                                            <div className="pl-6">
                                                {item.dropdown.map((dropItem, idx) => (
                                                    <NavLink
                                                        key={idx}
                                                        to={dropItem.path}
                                                        onClick={() => {
                                                            setIsOpen(false);
                                                            setMobileDropdown(null);
                                                        }}
                                                        className="block px-3 py-2 text-sm hover:bg-white/10"
                                                    >
                                                        {dropItem.title}
                                                    </NavLink>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <NavLink
                                        to={item.path}
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center space-x-2 px-3 py-2 text-base font-medium hover:bg-white/10"
                                    >
                                        {item.icon}
                                        <span>{item.title}</span>
                                    </NavLink>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default NavBar;
