import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useSelector } from "react-redux";
import { roleHome, roleLabel } from "../lib/roles.js";

const UnauthorizedPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useSelector((state) => state.auth);

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center rounded-2xl border border-slate-200 bg-white p-10 shadow-xl">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gold-400/20">
                    <ShieldAlert className="h-8 w-8 text-gold-600" />
                </div>
                <h1 className="font-display text-3xl font-semibold text-navy-900">Access denied</h1>
                <p className="mt-3 text-slate-600">
                    {isAuthenticated
                        ? `Your ${roleLabel(user?.role).toLowerCase()} account doesn't have permission to open this page.`
                        : "You need to sign in to open this page."}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Go back
                    </button>
                    <Link
                        to={isAuthenticated ? roleHome(user?.role) : "/login"}
                        className="rounded-lg bg-navy-800 px-5 py-2.5 font-semibold text-white hover:bg-navy-700"
                    >
                        {isAuthenticated ? "Go to my home" : "Sign in"}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default UnauthorizedPage;
