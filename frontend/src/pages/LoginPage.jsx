import { errorMessage } from "../lib/errors";
import { useState } from "react";
import { useLoginMutation } from "../api/authApi";
import { useDispatch } from "react-redux";
import { setCredentials } from "../store/authSlice.js";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Loader, Eye, EyeOff } from "lucide-react";
import Input from "../components/Input.jsx";
import { toast } from "sonner";
import { postLoginPath } from "../lib/roles.js";

function LoginPage() {
    const [credential, setCredential] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [login, { isLoading, isError, error }] = useLoginMutation();

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await login(credential).unwrap();
            dispatch(setCredentials(response.user));
            toast.success(`Welcome back, ${response.user.name}!`);
            // Send people back to where they were headed, otherwise to the home for their role
            navigate(postLoginPath(response.user.role, location.state?.from?.pathname), { replace: true });
        } catch (e) {
            console.error("Login failed:", e);
            toast.error(errorMessage(e, "Failed to login. Try again!"));
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
            <div className="h-1.5 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-400" />
            <div className="p-8">
                <h2 className="mb-1 text-center font-display text-3xl font-semibold text-navy-900">
                    Sign in
                </h2>
                <p className="mb-6 text-center text-sm text-slate-500">
                    Team owners, auctioneers and admins all sign in here.
                </p>
                <form onSubmit={handleSubmit}>
                    <Input
                        icon={Mail}
                        type="email"
                        placeholder="Email"
                        autoComplete="email"
                        required
                        value={credential.email}
                        onChange={(e) => setCredential({ ...credential, email: e.target.value })}
                    />
                    <Input
                        icon={Lock}
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        autoComplete="current-password"
                        required
                        value={credential.password}
                        onChange={(e) => setCredential({ ...credential, password: e.target.value })}
                        rightSlot={
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="text-slate-400 hover:text-slate-600"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                            </button>
                        }
                    />
                    {isError && (
                        <p className="mb-4 text-sm font-medium text-red-600" role="alert">
                            {errorMessage(error)}
                        </p>
                    )}
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full rounded-lg bg-navy-800 py-3 font-bold text-white shadow-lg transition duration-200 hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:ring-offset-2 disabled:opacity-60"
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader className="mx-auto size-5 animate-spin" /> : "Sign in"}
                    </motion.button>
                </form>
            </div>
            <div className="flex justify-center bg-slate-50 px-8 py-4">
                <p className="text-sm text-slate-600">
                    New team owner?{" "}
                    <Link to="/signup" className="font-semibold text-navy-700 hover:underline">
                        Create an account
                    </Link>
                </p>
            </div>
        </motion.div>
    );
}

export default LoginPage;
