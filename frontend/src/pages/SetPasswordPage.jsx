import { errorMessage } from "../lib/errors";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { Lock, Loader, Eye, EyeOff, Link2Off } from "lucide-react";
import { toast } from "sonner";
import Input from "../components/Input.jsx";
import LoadSpinner from "../components/LoadSpinner.jsx";
import { useAcceptInviteMutation, useGetInviteInfoQuery, useResetPasswordMutation } from "../api/authApi.js";
import { setCredentials } from "../store/authSlice.js";
import { roleHome } from "../lib/roles.js";

const Card = ({ children }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
    >
        <div className="h-1.5 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-400" />
        {children}
    </motion.div>
);

// Opened from an admin-issued link: /invite/:token (new auctioneer) or /reset/:token (forgotten password).
// A team-owner invite just forwards to the signup page.
function SetPasswordPage() {
    const { token } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const isResetRoute = location.pathname.startsWith("/reset/");

    const { data: info, isLoading, isError } = useGetInviteInfoQuery(token);
    const [acceptInvite, { isLoading: accepting }] = useAcceptInviteMutation();
    const [resetPassword, { isLoading: resetting }] = useResetPasswordMutation();

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [show, setShow] = useState(false);

    if (isLoading) return <LoadSpinner />;

    const wrongKind =
        info && ((isResetRoute && info.type !== "password-reset") || (!isResetRoute && info.type === "password-reset"));

    if (isError || wrongKind) {
        return (
            <Card>
                <div className="p-8 text-center">
                    <Link2Off className="mx-auto mb-4 h-10 w-10 text-slate-400" />
                    <h2 className="font-display text-2xl font-semibold text-navy-900">Link not valid</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        This link has expired or was already used. Ask an admin to send you a new one.
                    </p>
                    <Link to="/login" className="mt-6 inline-block font-semibold text-navy-700 hover:underline">
                        Back to sign in
                    </Link>
                </div>
            </Card>
        );
    }

    if (info?.type === "owner-invite") {
        return <Navigate to={`/signup?invite=${encodeURIComponent(token)}`} replace />;
    }

    const isReset = info?.type === "password-reset";

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 8) return toast.error("Password must be at least 8 characters");
        if (password !== confirm) return toast.error("Passwords do not match");
        try {
            if (isReset) {
                await resetPassword({ token, password }).unwrap();
                toast.success("Password updated. Please sign in.");
                navigate("/login", { replace: true });
            } else {
                const res = await acceptInvite({ token, password }).unwrap();
                dispatch(setCredentials(res.user));
                toast.success(`Welcome, ${res.user.name}!`);
                navigate(roleHome(res.user.role), { replace: true });
            }
        } catch (error) {
            toast.error(errorMessage(error));
        }
    };

    const busy = accepting || resetting;
    const toggle = (
        <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="text-slate-400 hover:text-slate-600"
            aria-label={show ? "Hide password" : "Show password"}
        >
            {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
    );

    return (
        <Card>
            <div className="p-8">
                <h2 className="mb-1 text-center font-display text-3xl font-semibold text-navy-900">
                    {isReset ? "Choose a new password" : "Set up your account"}
                </h2>
                <p className="mb-6 text-center text-sm text-slate-500">
                    {isReset ? (
                        <>
                            Resetting the password for <strong>{info?.email}</strong>.
                        </>
                    ) : (
                        <>
                            Welcome, <strong>{info?.name}</strong>. You&apos;ve been invited as an auctioneer (
                            {info?.email}). Choose a password to finish.
                        </>
                    )}
                </p>
                <form onSubmit={handleSubmit}>
                    <Input
                        icon={Lock}
                        type={show ? "text" : "password"}
                        placeholder="New password (min 8 characters)"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        rightSlot={toggle}
                    />
                    <Input
                        icon={Lock}
                        type={show ? "text" : "password"}
                        placeholder="Confirm password"
                        autoComplete="new-password"
                        required
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                    />
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full rounded-lg bg-navy-800 py-3 font-bold text-white shadow-lg transition duration-200 hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:ring-offset-2 disabled:opacity-60"
                        type="submit"
                        disabled={busy}
                    >
                        {busy ? (
                            <Loader className="mx-auto size-5 animate-spin" />
                        ) : isReset ? (
                            "Update password"
                        ) : (
                            "Create my account"
                        )}
                    </motion.button>
                </form>
            </div>
        </Card>
    );
}

export default SetPasswordPage;
