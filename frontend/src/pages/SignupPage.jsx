import { errorMessage } from "../lib/errors";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Loader, User, Users, Image, ArrowRight, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import Input from "../components/Input.jsx";
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useIsEmailAlreadyinUseMutation } from "../api/authApi.js";
import { useSignupAndCreateTeamMutation, useGetSignupConfigQuery, useGetInviteInfoQuery } from "../api/authApi.js";
import LoadSpinner from "../components/LoadSpinner.jsx";
import getTeamThemeColor from "../lib/colorThemeUtil.js";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";

import { useDispatch } from "react-redux";
import { setCredentials } from "../store/authSlice.js";
import { roleHome } from "../lib/roles.js";

// A simple round logo with the team's short name, used when no logo URL is given
const defaultLogo = (shortName, fill) =>
    `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><circle cx="48" cy="48" r="46" fill="${fill || "#1f4190"}"/><text x="48" y="58" font-family="Arial" font-size="28" font-weight="700" fill="white" text-anchor="middle">${String(shortName || "").toUpperCase()}</text></svg>`
    )}`;

function SignupPage() {
    const dispatch = useDispatch();
    const [step, setStep] = useState(1);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [teamName, setTeamName] = useState("");
    const [shortName, setShortName] = useState("");
    const [logo, setLogo] = useState("");
    const [color, setColor] = useState("default");
    const [emailValid, setEmailValid] = useState(false);
    const [emailChecked, setEmailChecked] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const inviteToken = searchParams.get("invite");
    const { data: signupConfig, isLoading: configLoading } = useGetSignupConfigQuery();
    const { data: inviteInfo, isLoading: inviteLoading } = useGetInviteInfoQuery(inviteToken, { skip: !inviteToken });
    const inviteIsValid = inviteInfo?.type === "owner-invite";
    const lockedEmail = inviteIsValid ? inviteInfo.email : undefined;
    const [signupAndCreateTeam, { isLoading: isSubmitting }] = useSignupAndCreateTeamMutation();
    const [emailCheck, { isLoading: emailLoading }] = useIsEmailAlreadyinUseMutation();

    // An invite issued for a specific email fixes the email address
    useEffect(() => {
        if (lockedEmail) setEmail(lockedEmail);
    }, [lockedEmail]);

    // Check password strength
    useEffect(() => {
        if (!password) {
            setPasswordStrength(0);
            return;
        }

        let strength = 0;
        if (password.length >= 8) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[a-z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;

        setPasswordStrength(strength);
    }, [password]);

    // Check email validity when email changes
    useEffect(() => {
        setEmailChecked(false);
        setEmailValid(false);
    }, [email]);

    const checkEmail = async () => {
        if (!email.trim() || !email.includes("@")) {
            return false;
        }

        try {
            const res = await emailCheck(email).unwrap();
            setEmailChecked(true);
            if (res.success === true) {
                setEmailValid(true);
                return true;
            } else {
                setEmailValid(false);
                throw new Error(errorMessage(res.error, "Email already in use"));
            }
        } catch (error) {
            setEmailValid(false);
            toast.error(error.message || "Failed to verify email");
            return false;
        }
    };

    const validateStep1 = async () => {
        if (!name.trim()) {
            toast.error("Please enter your name");
            return false;
        }

        if (!email.trim() || !email.includes("@")) {
            toast.error("Please enter a valid email");
            return false;
        }

        if (password.length < 8) {
            // Updated to match backend validation
            toast.error("Password must be at least 8 characters");
            return false;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return false;
        }

        if (!emailChecked) {
            const res = await checkEmail();
            return res;
        }
        return emailValid;
    };

    const validateStep2 = () => {
        if (!teamName.trim()) {
            toast.error("Please enter your team name");
            return false;
        }
        if (!shortName.trim()) {
            toast.error("Please enter a team short name");
            return false;
        }
        if (shortName.length > 4) {
            toast.error("Short name must be maximum 4 characters");
            return false;
        }
        return true;
    };

    const nextStep = async () => {
        const isValid = await validateStep1();
        if (step === 1 && isValid) {
            setStep(2);
        }
    };

    const prevStep = () => {
        if (step === 2) {
            setStep(1);
        }
    };

    const HandleSubmit = async (e) => {
        e.preventDefault();
        // Pressing Enter on step 1 should advance, not submit
        if (step === 1) {
            await nextStep();
            return;
        }
        const isValid1 = await validateStep1();
        const isValid2 = validateStep2();

        if (!isValid1 || !isValid2) {
            toast.error("Please fix the errors before continuing");
            return;
        }

        try {
            // Use the new combined endpoint
            const userData = {
                name,
                email,
                password,
                inviteToken: inviteToken || undefined,
                teamName,
                shortName,
                logo: logo.trim() || defaultLogo(shortName, getTeamThemeColor(color).primary),
                color,
            };

            const response = await signupAndCreateTeam(userData).unwrap();
            if (response?.success) {
                dispatch(setCredentials(response.user));
            } else {
                throw new Error(errorMessage(response.error, "Failed to create account. Please try again!"));
            }
            toast.success("Account and team created successfully!");
            navigate(roleHome("user"), { replace: true });
        } catch (error) {
            console.error("SignUp failed:", error);
            toast.error(errorMessage(error, error?.message || "Failed to create account. Please try again!"));
        }
    };

    const getStrengthColor = () => {
        if (passwordStrength <= 1) return "bg-red-500";
        if (passwordStrength <= 3) return "bg-yellow-500";
        return "bg-green-500";
    };

    const slideVariants = {
        enter: (direction) => ({
            x: direction > 0 ? 250 : -250,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction) => ({
            x: direction < 0 ? 250 : -250,
            opacity: 0,
        }),
    };

    const COLORS = [
        "default",
        "yellow",
        "blue",
        "red",
        "black",
        "purple",
        "pink",
        "orange",
        "silver",
        "lightblue",
        "darkblue",
        "redblack",
        "purplegold",
        "pinkblue",
        "bluered",
        "orangeblack",
        "redsilver",
        "lightblueorange",
        "darkbluegold",
    ];

    if (configLoading || inviteLoading) return <LoadSpinner />;

    if (signupConfig?.mode === "invite" && !inviteIsValid) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full rounded-2xl border border-slate-200 shadow-xl overflow-hidden bg-white"
            >
                <div className="h-1.5 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-400" />
                <div className="p-8 text-center">
                    <h2 className="font-display text-3xl font-semibold text-navy-900 mb-2">Invite only</h2>
                    <p className="text-sm text-slate-600">
                        {inviteToken
                            ? "This invite link has expired or was already used. Ask an admin for a new one."
                            : "New team owners join by invitation. Ask an admin for your invite link."}
                    </p>
                    <Link to="/login" className="mt-6 inline-block font-semibold text-navy-700 hover:underline">
                        Already have an account? Sign in
                    </Link>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full rounded-2xl border border-slate-200 shadow-xl overflow-hidden bg-white"
        >
            <div className="h-1.5 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-400" />
            <div className="p-8">
                <h2 className="font-display text-3xl text-center font-semibold text-navy-900 mb-2">
                    {step === 1 ? "Create Account" : "Set Up Your Team"}
                </h2>
                <div className="flex justify-center mb-6">
                    <div className="flex items-center">
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                step >= 1 ? "bg-navy-800 text-white" : "bg-gray-200"
                            }`}
                        >
                            {emailValid ? <CheckCircle className="h-5 w-5" /> : "1"}
                        </div>
                        <div className={`w-16 h-1 ${step >= 2 ? "bg-navy-800" : "bg-gray-200"}`}></div>
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                step >= 2 ? "bg-navy-800 text-white" : "bg-gray-200"
                            }`}
                        >
                            2
                        </div>
                    </div>
                </div>
                <form onSubmit={HandleSubmit}>
                    <AnimatePresence mode="wait" initial={false} custom={step > 1 ? 1 : -1}>
                        {step === 1 ? (
                            <motion.div
                                key="step1"
                                custom={1}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: "tween", duration: 0.3 }}
                                className="space-y-4"
                            >
                                <Input
                                    icon={User}
                                    type="text"
                                    placeholder="Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                                <div className="relative">
                                    <Input
                                        icon={Mail}
                                        type="email"
                                        placeholder="Email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onBlur={checkEmail}
                                        readOnly={!!lockedEmail}
                                        required
                                    />
                                    {emailChecked && (
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            {emailValid ? (
                                                <CheckCircle className="h-5 w-5 text-green-500" />
                                            ) : (
                                                <span className="text-sm text-red-500">Email unavailable</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <Input
                                        icon={Lock}
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    {password && (
                                        <div className="mt-1">
                                            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${getStrengthColor()}`}
                                                    style={{ width: `${(passwordStrength / 5) * 100}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {passwordStrength <= 1
                                                    ? "Weak"
                                                    : passwordStrength <= 3
                                                    ? "Medium"
                                                    : "Strong"}{" "}
                                                password
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <Input
                                    icon={Lock}
                                    type="password"
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                                {confirmPassword && password !== confirmPassword && (
                                    <p className="text-xs text-red-500 -mt-2">Passwords do not match</p>
                                )}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full py-3 mt-4 bg-navy-800 hover:bg-navy-700 text-white font-bold rounded-lg shadow hover:shadow-lg focus:ring-2 focus:ring-navy-600 transition duration-200 flex items-center justify-center"
                                    type="button"
                                    onClick={nextStep}
                                    disabled={emailLoading}
                                >
                                    {emailLoading ? (
                                        <div className="flex items-center">
                                            <Loader2 className="animate-spin" />
                                            <span className="ml-2">Verifying...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center">
                                            <span>Next Step</span>
                                            <ArrowRight className="ml-2 size-4" />
                                        </div>
                                    )}
                                </motion.button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step2"
                                custom={-1}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: "tween", duration: 0.3 }}
                            >
                                <Input
                                    icon={Users}
                                    type="text"
                                    placeholder="Team Name"
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    required
                                />
                                <div className="relative">
                                    <Input
                                        icon={User}
                                        type="text"
                                        placeholder="Team Short Name (e.g., CSK)"
                                        value={shortName}
                                        onChange={(e) => setShortName(e.target.value.toUpperCase())}
                                        maxLength={4}
                                        required
                                    />
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <span className="text-xs text-gray-500">{shortName.length}/4</span>
                                    </div>
                                </div>
                                <div className="flex w-full items-center gap-3">
                                    {logo && (
                                        <Avatar className="h-12 w-12 flex-none border border-slate-200 shadow-sm">
                                            <AvatarImage src={logo} alt="Team Logo" />
                                            <AvatarFallback>{name?.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <Input
                                            icon={Image}
                                            type="url"
                                            placeholder="Team logo URL (optional)"
                                            value={logo}
                                            onChange={(e) => setLogo(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 text-sm font-medium text-slate-700">Team colour</p>
                                    <div className="grid grid-cols-7 gap-2.5">
                                        {COLORS.map((colori) => (
                                            <button
                                                key={colori}
                                                type="button"
                                                title={colori}
                                                aria-label={`Colour ${colori}`}
                                                aria-pressed={color === colori}
                                                onClick={() => setColor(colori)}
                                                style={{ background: getTeamThemeColor(colori).primary }}
                                                className={`h-9 w-9 rounded-full border border-white shadow transition hover:scale-110 ${
                                                    color === colori ? "ring-2 ring-navy-900 ring-offset-2" : ""
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex space-x-4 mt-6">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-1/3 py-3 bg-gray-200 text-gray-800 font-bold rounded-lg shadow hover:bg-gray-300 focus:ring-2 focus:ring-gray-300 transition duration-200 flex items-center justify-center"
                                        type="button"
                                        onClick={prevStep}
                                    >
                                        <ArrowLeft className="mr-2 size-4" />
                                        Back
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-2/3 py-3 bg-navy-800 hover:bg-navy-700 text-white font-bold rounded-lg shadow hover:shadow-lg focus:ring-2 focus:ring-navy-600 transition duration-200 flex items-center justify-center"
                                        type="submit"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <div className="flex items-center">
                                                <Loader className="animate-spin size-5" />
                                                <span className="ml-2">Creating...</span>
                                            </div>
                                        ) : (
                                            "Create Account & Team"
                                        )}
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </form>
            </div>
            <div className="px-8 py-4 bg-slate-50 flex justify-center">
                <p className="text-sm text-gray-600">
                    Already have an account?{" "}
                    <Link to="/login" className="text-navy-700 font-semibold hover:underline">
                        Login
                    </Link>
                </p>
            </div>
        </motion.div>
    );
}

export default SignupPage;
