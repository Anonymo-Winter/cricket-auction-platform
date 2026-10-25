import { Link } from "react-router-dom";
import { Gavel, Users, ShieldCheck } from "lucide-react";
import iplLogo from "../assets/logo.webp";

const HIGHLIGHTS = [
    { icon: Gavel, text: "Run live auctions with real-time bidding" },
    { icon: Users, text: "Build your squad within your purse" },
    { icon: ShieldCheck, text: "Separate access for owners, auctioneers and admins" },
];

// Shared shell for the login and signup screens: brand panel on the left, form on the right.
const AuthLayout = ({ children }) => (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-slate-50">
        <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 p-12 text-white">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold-400/10 blur-3xl"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-navy-600/40 blur-3xl"
            />
            <Link to="/auctions" className="relative flex items-center gap-3">
                <img src={iplLogo} alt="IPL" className="h-14 w-14 object-contain" />
                <span className="font-display text-2xl tracking-tight ">IPL Auction</span>
            </Link>
            <div className="relative space-y-8">
                <h1 className="font-display text-5xl font-semibold leading-tight">
                    Bid. Build. <span className="text-gold-400">Win the season.</span>
                </h1>
                <ul className="space-y-4 text-navy-50/90">
                    {HIGHLIGHTS.map(({ icon: Icon, text }) => (
                        <li key={text} className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                                <Icon className="h-5 w-5 text-gold-400" />
                            </span>
                            {text}
                        </li>
                    ))}
                </ul>
            </div>
            <p className="relative text-sm text-white/50">One sign-in for every role — you&apos;ll land on the right screen.</p>
        </aside>
        <main className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
            <Link to="/auctions" className="mb-6 flex items-center gap-2 lg:hidden">
                <img src={iplLogo} alt="IPL" className="h-12 w-12 object-contain" />
                <span className="font-display text-xl tracking-tight text-navy-900">IPL Auction</span>
            </Link>
            {children}
        </main>
    </div>
);

export default AuthLayout;
