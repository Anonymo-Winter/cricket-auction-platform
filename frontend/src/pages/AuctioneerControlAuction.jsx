import ErrorState from "../components/ErrorState.jsx";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Clock, CheckCircle, XCircle, RotateCcw, Bell, Users, Wallet, AlertTriangle, CheckCircle as CheckCircleIcon, Activity, ChevronUp, ChevronDown, User, DollarSign, ArrowRight, Sparkles, WifiOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { Link, useNavigate, useParams } from "react-router-dom";
import LoadSpinner from "../components/LoadSpinner.jsx";
import { usePlacebidMutation } from "../api/livebiddingApi.js";
import io from "socket.io-client";
import bidSuccess from "../assets/bid_sound1.mp3";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import bidError from "../assets/bidError.mp3";
import AuctionNotStarted from "../components/AuctionNotStarted.jsx";
import PlayerStatsSection from "../components/PlayerStatsSection.jsx";
import TrackPlayersByStatus from "../components/TrackPlayersByStatus.jsx";
import { useSelector } from "react-redux";
import { useStopAuctionMutation, useStartAuctionMutation, useCompleteAuctionMutation } from "../api/auctionApi.js";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import LiveCues from "../components/LiveCues.jsx";
import { Monitor, Eye } from "lucide-react";
import { API_ORIGIN } from "../config.js";

// Utility function for currency formatting
const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "----";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    })
        .format(amount)
        .replace("INR", "₹");
};

// Extracted CountdownTimer component with improved visuals
// const CountdownTimer = ({ time, status }) => {
//     // Calculate time left once during initialization
//     const [timeLeft, setTimeLeft] = useState(() => {
//         const endTime = new Date(time).getTime();
//         return Math.max(Math.floor((endTime - Date.now()) / 1000), 0);
//     });

//     // Derive isCritical from timeLeft instead of managing as separate state
//     const isCritical = timeLeft <= 5;

//     useEffect(() => {
//         if (status !== "active") return;
//         // Recalculate initial time when the time prop changes
//         const endTime = new Date(time).getTime();
//         setTimeLeft(Math.max(Math.floor((endTime - Date.now()) / 1000), 0));

//         const interval = setInterval(() => {
//             setTimeLeft((prevTime) => {
//                 const newTime = Math.max(prevTime - 1, 0);
//                 if (newTime === 0) {
//                     clearInterval(interval);
//                 }
//                 return newTime;
//             });
//         }, 1000);

//         return () => clearInterval(interval);
//     }, [time, status]); // Only re-create the interval when time prop changes

//     return (
//         <motion.div
//             initial={{ opacity: 0, scale: 0.9 }}
//             animate={{ opacity: 1, scale: 1 }}
//             transition={{ duration: 0.3 }}
//             className={`p-1 rounded-xl text-center shadow-md ${
//                 isCritical
//                     ? "bg-gradient-to-br from-red-600 to-red-700 animate-pulse"
//                     : "bg-gradient-to-br from-navy-700 to-navy-900"
//             }`}
//         >
//             <div className="flex flex-col items-center p-5">
//                 <span className="text-xs font-medium text-white/80">Time Remaining</span>
//                 <span className="text-3xl font-bold text-white drop-shadow-md">{timeLeft}s</span>
//             </div>
//         </motion.div>
//     );
// };

// const CountdownTimer = ({ timeRemaining, status }) => {
//     const [displayTime, setDisplayTime] = useState(Math.floor(timeRemaining / 1000));
//     const timerRef = useRef(null);

//     useEffect(() => {
//         // Reset timer if new time comes from backend
//         if (status !== "active") {
//             clearInterval(timerRef.current);
//             return;
//         }

//         setDisplayTime(Math.floor(timeRemaining / 1000));
//         clearInterval(timerRef.current);

//         timerRef.current = setInterval(() => {
//             setDisplayTime((prev) => {
//                 const updated = Math.max(prev - 1, 0);
//                 if (updated === 0) clearInterval(timerRef.current);
//                 return updated;
//             });
//         }, 1000);

//         return () => clearInterval(timerRef.current);
//     }, [timeRemaining, status]);

//     const isCritical = displayTime <= 5;

//     return (
//         <motion.div
//             initial={{ opacity: 0, scale: 0.9 }}
//             animate={{ opacity: 1, scale: 1 }}
//             transition={{ duration: 0.3 }}
//             className={`p-1 rounded-xl text-center shadow-md ${
//                 isCritical
//                     ? "bg-gradient-to-br from-red-600 to-red-700 animate-pulse"
//                     : "bg-gradient-to-br from-navy-700 to-navy-900"
//             }`}
//         >
//             <div className="flex flex-col items-center p-5">
//                 <span className="text-xs font-medium text-white/80">Time Remaining</span>
//                 <span className="text-3xl font-bold text-white drop-shadow-md">{displayTime}s</span>
//             </div>
//         </motion.div>
//     );
// };

// const CountdownTimer = ({ time, status, serverTime }) => {

//     // Calculate initial time left using server synchronization
//     const [timeLeft, setTimeLeft] = useState(() => {
//         if (!time) return 0;

//         // Use serverTime for initial sync if available
//         const endTime = new Date(time).getTime();
//         const now = serverTime || Date.now();
//         return Math.max(Math.floor((endTime - now) / 1000), 0);
//     });


//     // Track the actual end time for drift correction
//     const endTimeRef = useRef(new Date(time).getTime());

//     // For debugging drift issues
//     const [drift, setDrift] = useState(0);
//     const [lastSync, setLastSync] = useState(0);

//     // Derived states
//     const isCritical = timeLeft <= 5;
//     const isExpired = timeLeft <= 0;

//     // Format time for display (optional)
//     const formatTime = (seconds) => {
//         if (seconds <= 0) return "0s";
//         const mins = Math.floor(seconds / 60);
//         const secs = seconds % 60;
//         return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
//     };

//     useEffect(() => {
//         // Reset when receiving new time prop
//         if (time) {
//             const newEndTime = new Date(time).getTime();
//             endTimeRef.current = newEndTime;

//             // Calculate with server time if available
//             const now = serverTime || Date.now();
//             const newTimeLeft = Math.max(Math.floor((newEndTime - now) / 1000), 0);

//             setTimeLeft(newTimeLeft);
//             setLastSync(now);

//             // Log drift for debugging
//             const calculatedRemaining = newEndTime - now;
//             const displayedRemaining = newTimeLeft * 1000;
//             setDrift(calculatedRemaining - displayedRemaining);
//         }
//     }, [time, serverTime]);

//     useEffect(() => {
//         if (status !== "active" || isExpired) return;

//         let requestId;
//         let lastTick = performance.now();

//         const updateTimer = () => {
//             const now = Date.now();
//             const newTimeLeft = Math.max(Math.floor((endTimeRef.current - now) / 1000), 0);

//             setTimeLeft(newTimeLeft);

//             // Check for significant drift (>500ms)
//             const expectedTime = (endTimeRef.current - now) / 1000;
//             if (Math.abs(expectedTime - newTimeLeft) > 0.5) {
//                 console.warn(`Timer drift detected: ${expectedTime - newTimeLeft}s`);
//             }

//             if (newTimeLeft > 0) {
//                 // Use requestAnimationFrame for smoother updates
//                 const elapsed = now - lastTick;
//                 const delay = Math.max(1000 - (elapsed % 1000), 0);
//                 lastTick = now;
//                 requestId = setTimeout(updateTimer, delay);
//             }
//         };

//         // Initial call with precise timing
//         const initialDelay = 1000 - (Date.now() % 1000);
//         requestId = setTimeout(updateTimer, initialDelay);

//         return () => {
//             if (requestId) clearTimeout(requestId);
//         };
//     }, [status, isExpired]);

//     // Debug view (remove in production)
//     const debugInfo = (
//         <div className="text-xs text-white/50 mt-1">
//             Last sync: {new Date(lastSync).toISOString().substr(11, 8)} | Drift:{" "}
//             {new Date(drift).toISOString().substr(11, 8)}s
//         </div>
//     );

//     return (
//         <motion.div
//             initial={{ opacity: 0, scale: 0.9 }}
//             animate={{ opacity: 1, scale: 1 }}
//             transition={{ duration: 0.3 }}
//             className={`p-1 rounded-xl text-center shadow-md ${
//                 isCritical
//                     ? "bg-gradient-to-br from-red-600 to-red-700 animate-pulse"
//                     : "bg-gradient-to-br from-navy-700 to-navy-900"
//             }`}
//         >
//             <div className="flex flex-col items-center p-5">
//                 <span className="text-xs font-medium text-white/80">
//                     {status === "paused" ? "Paused" : "Time Remaining"}
//                 </span>
//                 <span className="text-3xl font-bold text-white drop-shadow-md">{formatTime(timeLeft)}</span>
//                 {debugInfo}
//                 {/* {debugInfo} */}
//             </div>
//         </motion.div>
//     );
// };

const CountdownTimer = ({ time, status, serverTime }) => {
    const endTimeRef = useRef(0);
    const [displayTime, setDisplayTime] = useState("--");
    const [isCritical, setIsCritical] = useState(false);

    // Calculate initial time and setup timer
    useEffect(() => {
        if (!time) {
            setDisplayTime("--");
            return;
        }

        endTimeRef.current = new Date(time).getTime();
        updateDisplayTime();

        let animationFrame;
        let timeout;
        let lastUpdate = performance.now();

        const updateTimer = () => {
            updateDisplayTime();

            if (status === "active" && getSecondsLeft() > 0) {
                const now = performance.now();
                const elapsed = now - lastUpdate;
                const delay = Math.max(1000 - (elapsed % 1000), 16);

                timeout = setTimeout(() => {
                    animationFrame = requestAnimationFrame(updateTimer);
                }, delay);
                lastUpdate = now;
            }
        };

        // Start with precise alignment to second boundary
        const initialDelay = 1000 - (Date.now() % 1000);
        timeout = setTimeout(() => {
            animationFrame = requestAnimationFrame(updateTimer);
        }, initialDelay);

        return () => {
            clearTimeout(timeout);
            cancelAnimationFrame(animationFrame);
        };
        // Timer re-arms only when the clock inputs change; the helpers below are recreated every render
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [time, status, serverTime]);

    const getSecondsLeft = () => {
        const now = serverTime || Date.now();
        return Math.max(Math.floor((endTimeRef.current - now) / 1000), 0);
    };

    const updateDisplayTime = () => {
        const secondsLeft = getSecondsLeft();
        setIsCritical(secondsLeft <= 10);

        // Format time with milliseconds when critical
        if (secondsLeft <= 10) {
            const msLeft = Math.max(0, endTimeRef.current - (serverTime || Date.now()));
            const seconds = Math.floor(msLeft / 1000);
            const milliseconds = Math.floor((msLeft % 1000) / 10); // 2-digit ms
            setDisplayTime(`${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`);
        } else {
            const mins = Math.floor(secondsLeft / 60);
            const secs = secondsLeft % 60;
            setDisplayTime(mins > 0 ? `${mins}m ${secs}s` : `${secs}s`);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`relative p-1 rounded-xl text-center shadow-md ${
                isCritical ? "bg-gradient-to-br from-red-600 to-red-700" : "bg-gradient-to-br from-navy-700 to-navy-900"
            }`}
        >
            {/* Pulse animation for critical time */}
            {isCritical && (
                <motion.div
                    className="absolute inset-0 bg-white/10 rounded-xl"
                    animate={{ opacity: [0, 0.2, 0] }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            )}

            <div className="flex flex-col items-center p-5 relative z-10">
                <span className="text-xs font-medium text-white/80">
                    {status === "paused" ? "PAUSED" : "TIME REMAINING"}
                </span>

                <motion.span
                    className="text-3xl font-bold text-white drop-shadow-md font-mono"
                    key={displayTime}
                    initial={{ y: -5, opacity: 0.5 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                >
                    {displayTime}
                </motion.span>
            </div>
        </motion.div>
    );
};

const CountdownTimer2 = ({ timer = 0 }) => {
    const [isCritical, setIsCritical] = useState(false);

    useEffect(() => {
        if (timer) setIsCritical(timer <= 5);
    }, [timer]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`p-1 rounded-xl text-center shadow-md ${
                isCritical
                    ? "bg-gradient-to-br from-red-600 to-red-700 animate-pulse"
                    : "bg-gradient-to-br from-navy-700 to-navy-900"
            }`}
        >
            <div className="flex flex-col items-center p-5">
                <span className="text-xs font-medium text-white/80">Timer Remaining</span>
                <span className="text-3xl font-bold text-white drop-shadow-md">{Math.max(timer, 0)}s</span>
            </div>
        </motion.div>
    );
};

// Improved MakePollButton component
// export const MakePollButton = ({
//     auctionStatus,
//     handleMakePoll,
//     cooldownDuration,
//     status,
//     totalVotes,
//     handleStart,
//     isCompleted,
//     auctioneerId,
//     auctionId,
//     unsoldPlayers,
//     pendingPlayers,
// }) => {
//     const [completeAuction, { isLoading }] = useCompleteAuctionMutation();
//     9;
//     const handleCompleteAuction = async () => {
//         try {
//             const res = await completeAuction({ auctioneerId, auctionId });
//             if (res.data?.success) {
//                 toast.success("Auction completed successfully!");
//             } else {
//                 throw new Error(res.error?.data?.message || "Failed to complete auction");
//             }
//         } catch (error) {
//             toast.error(error.message);
//         }
//     };

//     const ButtonCommon = ({ children, onClick, disabled = false, className }) => (
//         <Button
//             className={`h-12 px-6 text-base font-semibold rounded-xl shadow-md transition-all duration-200 ${className}`}
//             onClick={onClick}
//             disabled={disabled}
//         >
//             {children}
//         </Button>
//     );

//     if (auctionStatus === "scheduled" || pendingPlayers > 0) {
//         return (
//             <ButtonCommon
//                 onClick={handleStart}
//                 className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
//             >
//                 Start Auction
//             </ButtonCommon>
//         );
//     }

//     if (status) {
//         return (
//             <ButtonCommon disabled className="bg-gradient-to-r from-navy-700 to-navy-900 text-white opacity-90">
//                 Wait {cooldownDuration}s
//             </ButtonCommon>
//         );
//     }

//     const noUnsoldPlayers = !unsoldPlayers || unsoldPlayers.length === 0;

//     if (isCompleted && pendingPlayers === 0) {
//         return (
//             <ButtonCommon
//                 onClick={handleCompleteAuction}
//                 className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
//             >
//                 {isLoading ? "Processing..." : "Complete Auction"}
//             </ButtonCommon>
//         );
//     }

//     if (pendingPlayers <= 0 && noUnsoldPlayers) {
//         return (
//             <ButtonCommon
//                 onClick={handleCompleteAuction}
//                 className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
//             >
//                 Complete Auction
//             </ButtonCommon>
//         );
//     }

//     return (
//         <div className="flex gap-3">
//             {isCompleted ? (
//                 totalVotes > 0 ? (
//                     <ButtonCommon
//                         onClick={handleStart}
//                         className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
//                     >
//                         Start Auction
//                     </ButtonCommon>
//                 ) : (
//                     <>
//                         <ButtonCommon
//                             onClick={handleCompleteAuction}
//                             className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
//                         >
//                             Complete
//                         </ButtonCommon>
//                         <ButtonCommon
//                             onClick={handleMakePoll}
//                             className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
//                         >
//                             Make Poll
//                         </ButtonCommon>
//                     </>
//                 )
//             ) : (
//                 <ButtonCommon
//                     onClick={handleMakePoll}
//                     className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
//                 >
//                     Make Poll
//                 </ButtonCommon>
//             )}
//         </div>
//     );
// };
// export const MakePollButton = ({
//     auctionStatus,
//     handleMakePoll,
//     cooldownDuration,
//     status,
//     totalVotes,
//     handleStart,
//     isCompleted,
//     auctioneerId,
//     auctionId,
//     unsoldPlayers,
//     pendingPlayers,
//     handleCompleteAuction,
// }) => {
//     const [isMakingPoll, setIsMakingPoll] = useState(false);

//     const handlePollClick = async () => {
//         setIsMakingPoll(true);
//         try {
//             await handleMakePoll();
//         } catch (error) {
//             toast.error("Failed to create poll");
//         } finally {
//             setIsMakingPoll(false);
//         }
//     };

//     const ButtonCommon = ({ children, onClick, disabled = false, className, loading = false }) => (
//         <Button
//             className={`h-12 px-6 text-base font-semibold rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-2 ${
//                 disabled ? "opacity-70 cursor-not-allowed" : "hover:shadow-lg transform hover:-translate-y-0.5"
//             } ${className}`}
//             onClick={onClick}
//             disabled={disabled || loading}
//         >
//             {loading ? (
//                 <>
//                     <Spinner className="w-5 h-5" />
//                     Processing...
//                 </>
//             ) : (
//                 children
//             )}
//         </Button>
//     );

//     if (status) {
//         return (
//             <ButtonCommon disabled className="bg-gradient-to-r from-navy-700 to-navy-900 text-white">
//                 <ClockIcon className="w-5 h-5" />
//                 Wait {cooldownDuration}s
//             </ButtonCommon>
//         );
//     }

//     const noUnsoldPlayers = !unsoldPlayers || unsoldPlayers.length === 0;
//     const canComplete = (isCompleted && pendingPlayers === 0) || (pendingPlayers <= 0 && noUnsoldPlayers);
//     if (canComplete) {
//         return (
//             <ButtonCommon
//                 onClick={handleCompleteAuction}
//                 className="bg-gradient-to-r from-red-600 to-red-700 text-white"
//             >
//                 Complete Auction
//             </ButtonCommon>
//         );
//     }

//     // Main button group for poll actions
//     return (
//         <div className="flex gap-3">
//             {isCompleted ? (
//                 totalVotes > 0 ? (
//                     <ButtonCommon
//                         onClick={handleStart}
//                         className="bg-gradient-to-r from-green-600 to-green-700 text-white"
//                     >
//                         Start Auction
//                     </ButtonCommon>
//                 ) : (
//                     <>
//                         <ButtonCommon
//                             onClick={handleCompleteAuction}
//                             className="bg-gradient-to-r from-red-600 to-red-700 text-white"
//                         >
//                             Complete
//                         </ButtonCommon>
//                         <ButtonCommon
//                             onClick={handlePollClick}
//                             loading={isMakingPoll}
//                             className="bg-gradient-to-r from-green-600 to-green-700 text-white"
//                         >
//                             Make Poll
//                         </ButtonCommon>
//                     </>
//                 )
//             ) : (
//                 <ButtonCommon
//                     onClick={handlePollClick}
//                     loading={isMakingPoll}
//                     className="bg-gradient-to-r from-green-600 to-green-700 text-white"
//                 >
//                     Make Poll
//                 </ButtonCommon>
//             )}
//         </div>
//     );
// };

export const MakePollButton = ({
    handleMakePoll,
    cooldownDuration,
    status,
    totalVotes,
    handleStart,
    isCompleted,
    unsoldPlayers,
    pendingPlayers,
    handleCompleteAuction,
}) => {
    const [isMakingPoll, setIsMakingPoll] = useState(false);

    const handlePollClick = async () => {
        setIsMakingPoll(true);
        try {
            await handleMakePoll();
        } catch {
            toast.error("Failed to create poll");
        } finally {
            setIsMakingPoll(false);
        }
    };

    const ButtonCommon = ({ children, onClick, disabled = false, className = "", loading = false }) => (
        <Button
            className={`h-12 px-6 text-base font-semibold rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-2 ${
                disabled ? "opacity-70 cursor-not-allowed" : "hover:shadow-lg transform hover:-translate-y-0.5"
            } ${className}`}
            onClick={onClick}
            disabled={disabled || loading}
        >
            {loading ? (
                <>
                    <Spinner className="w-5 h-5" />
                    Processing...
                </>
            ) : (
                children
            )}
        </Button>
    );

    const noUnsoldPlayers = !unsoldPlayers?.length;
    const canComplete = (isCompleted && pendingPlayers === 0) || (pendingPlayers <= 0 && noUnsoldPlayers);

    if (status) {
        return (
            <ButtonCommon disabled className="bg-gradient-to-r from-navy-700 to-navy-900 text-white">
                <ClockIcon className="w-5 h-5" />
                Wait {cooldownDuration}s
            </ButtonCommon>
        );
    }

    if (canComplete) {
        return (
            <ButtonCommon
                onClick={handleCompleteAuction}
                className="bg-gradient-to-r from-red-600 to-red-700 text-white"
            >
                Complete Auction
            </ButtonCommon>
        );
    }

    const renderButtons = () => {
        if (!isCompleted) {
            return (
                <ButtonCommon
                    onClick={handlePollClick}
                    loading={isMakingPoll}
                    className="bg-gradient-to-r from-green-600 to-green-700 text-white"
                >
                    Make Poll
                </ButtonCommon>
            );
        }

        if (totalVotes > 0) {
            return (
                <ButtonCommon onClick={handleStart} className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                    Start Auction
                </ButtonCommon>
            );
        }

        return (
            <>
                <ButtonCommon
                    onClick={handleCompleteAuction}
                    className="bg-gradient-to-r from-red-600 to-red-700 text-white"
                >
                    Complete
                </ButtonCommon>
                <ButtonCommon
                    onClick={handlePollClick}
                    loading={isMakingPoll}
                    className="bg-gradient-to-r from-green-600 to-green-700 text-white"
                >
                    Make Poll
                </ButtonCommon>
            </>
        );
    };

    return <div className="flex gap-3">{renderButtons()}</div>;
};

// Add these components to your project:
const Spinner = ({ className }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
    </svg>
);

const ClockIcon = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);
const LiveAuctionPage = () => {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [auctionData, setAuctionData] = useState(null);
    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [recBids, setRecBids] = useState([]);
    const [err] = useState("");
    const [customBidMode, setCustomBidMode] = useState(false);
    const [customBid, setCustomBid] = useState(0);
    const [notifications, setNotifications] = useState(false);
    const [viewerCount, setViewerCount] = useState(0);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [socket, setSocket] = useState(null);
    const [totalVotes, setTotalVotes] = useState(0);
    const [isCompleted, setIsCompleted] = useState(false);
    const [selectedPlayers, setSelectedPlayers] = useState([]);

    const [pollData, setPollData] = useState(false);
    const [completeAuction, ] = useCompleteAuctionMutation();

    const [unsoldPlayers, setUnsoldPlayers] = useState([]);
    const [pendingPlayers, setPendingPlayers] = useState(0);
    const [, setUpcomingPlayers] = useState(0);
    const [pollTimer, setPollTimer] = useState(0);

    const { user } = useSelector((state) => state.auth);
    // Admins can run any auction (pause, skip, sold, undo a bid) even when no auctioneer is assigned
    const canControl = user?.role === "auctioneer" || user?.role === "admin";
    const [stopAuction] = useStopAuctionMutation();
    const [startAuction] = useStartAuctionMutation();
    const navigate = useNavigate();

    const [showStatsDetail, setShowStatsDetail] = useState(false);
    const [undoOpen, setUndoOpen] = useState(false);
    const [connected, setConnected] = useState(true); // false while the live connection is down
    const [hasVoted, setHasVoted] = useState(false); // this owner already voted in the current poll
    const [timerData, setTimerData] = useState({});

    const [purseRemaining, setPurseRemaining] = useState(0);

    const [teamComposition, setTeamComposition] = useState({
        batsman: 0,
        bowler: 0,
        uncapped: 0,
        "all-rounder": 0,
    });

    // Is the signed-in owner's team already the highest bidder? (live bid updates carry teamId, loaded state carries team)
    const leadingTeam = auctionData?.currentBid?.team?._id ?? auctionData?.currentBid?.team ?? auctionData?.currentBid?.teamId;
    const isLeading = !!user?.team?._id && !!leadingTeam && String(leadingTeam) === String(user.team._id);

    // Between players (while the SOLD / UNSOLD result is on screen) nobody is up for auction
    const comingUp = auctionData?.status === "active" && !currentPlayer?.player;

    const minimumBid = useMemo(() => {
        if (!auctionData || !currentPlayer?.player) return 0;
        return auctionData.currentBid?.amount
            ? auctionData.currentBid.amount + auctionData.settings.minBidIncrement
            : currentPlayer.player.basePrice;
    }, [auctionData, currentPlayer]);

    const playBidSound = useCallback(
        (soundFile) => {
            let soundOn = false;
            try {
                soundOn = localStorage.getItem("auctionSound") === "on";
            } catch {
                soundOn = false;
            }
            if (soundOn) {
                const audio = new Audio(soundFile);
                audio.volume = 0.3; // Lower volume for better UX
                audio.play().catch((err) => console.warn("Audio playback failed:", err));
            }
        },
        []
    );

    const showNotification = useCallback(
        (message) => {
            if (notifications && "Notification" in window) {
                if (Notification.permission === "granted") {
                    new Notification("Auction Update", {
                        body: message,
                        icon: "/favicon.ico",
                        vibrate: [200, 100, 200],
                    });
                } else if (Notification.permission !== "denied") {
                    Notification.requestPermission().then((permission) => {
                        if (permission === "granted") {
                            new Notification("Auction Update", { body: message });
                        }
                    });
                }
            }
        },
        [notifications]
    );

    useEffect(() => {
        const composition = { batsman: 0, bowler: 0, uncapped: 0, "all-rounder": 0 };
        if (user && user.role === "user") {
            (user.team?.players || []).forEach((p) => {
                const role = p.player?.role;
                if (role) composition[role] = (composition[role] || 0) + 1;
                if (p.player?.isUncapped) composition.uncapped += 1;
            });
        }
        setTeamComposition(composition);
    }, [user]);

    // Socket connection and event handlers
    useEffect(() => {
        const newSocket = io(API_ORIGIN, {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            transports: ["websocket"],
            // sends the login cookie so the server knows who is connected (auctioneer controls need it)
            withCredentials: true,
        });

        // Runs on the first connection and on every automatic reconnect, so a dropped connection rejoins the room
        // and fetches the current state again
        newSocket.on("connect", () => {
            setConnected(true);
            newSocket.emit("joinAuction", id);
        });
        newSocket.on("disconnect", () => setConnected(false));
        newSocket.on("connect_error", () => setConnected(false));

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [id]);

    useEffect(() => {
        if (!socket) return;

        const handleInitialData = ({ auction, currentPlayer, recentBids, unsoldPlayers }) => {
            setAuctionData(auction);
            setCurrentPlayer(currentPlayer);
            setCustomBid(
                auction?.currentBid?.amount
                    ? auction.currentBid?.amount + auction.settings?.minBidIncrement
                    : currentPlayer?.player?.basePrice || 0
            );
            setUnsoldPlayers(unsoldPlayers);
            setUpcomingPlayers(auction?.players?.filter((p) => p.status === "pending").length);
            setPendingPlayers(auction?.players?.filter((p) => p.status === "pending").length);
            setRecBids(recentBids);
            setLoading(false);
            setIsCompleted(auction.activePoll?.completed);

            if (user && user.role === "user") {
                setPurseRemaining(() => user?.team?.registeredAuction?.find((p) => p.auctionId === id)?.purseRemaining);
            }
        };

        const handleBidUpdate = (data) => {
            setAuctionData((prev) => ({
                ...prev,
                currentBid: data.updatedBid,
            }));
            setRecBids((prev) => [data.placedBid, ...prev.slice(0, 49)]);
            setCustomBid(data.updatedBid.amount + (auctionData?.settings?.minBidIncrement || 0));
            playBidSound(bidSuccess);
            showNotification(`New bid: ${formatCurrency(data.updatedBid.amount)} by ${data.placedBid.team.shortName}`);
        };

        const handlePlayerUpdate = ({ currentPlayer }) => {
            setCurrentPlayer(currentPlayer);
            showNotification(`New player: ${currentPlayer?.player?.name || "Unknown"}`);
            setRecBids([]);
        };

        const handleAuctionUpdate = (data) => {
            setAuctionData(data.auction);
            if (user && user.role === "user") {
                data?.auction?.teams?.forEach((team) => {
                    if (team?.team === user.team?._id) {
                        setPurseRemaining(team.purseRemaining);
                    }
                });
            }
            // setAuctionData(data.auction);
            // if (data.auction.status === "completed") {
            //     showNotification("Auction completed!");
            // }
        };

        const handleTimerSync = (data) => {
            setAuctionData((prev) => ({
                ...prev,
                timeRemaining: data.endTime,
            }));
            setTimerData(data);
            // setPollTimer(data?.timeRemaining);
        };

        const handlePollTimer = (data) => {
            setPollData(data.timeRemaining > 0);
            setPollTimer(data.timeRemaining);
        };

        const handleError = (error) => {
            setHasVoted(false); // if a vote was rejected, let them vote again
            setErrorMessage(error.message);
            setTimeout(() => setErrorMessage(""), 5000);
            playBidSound(bidError);
        };

        // The server refuses control actions from anyone who isn't allowed; say so instead of failing silently
        const handleAuctionError = (error) => {
            toast.error(error?.message || "That action wasn't allowed");
        };

        const handleViewerCount = (data) => {
            setViewerCount(data.count);
        };

        const handleUserPoll = (data) => {
            setUnsoldPlayers(data.unsoldPlayers);
            setSelectedPlayers([]);
            setHasVoted(false);
            setPollData(true);
        };

        const handlePollComplete = (data) => {
            setTotalVotes(data?.totalVotes || 0);
            setIsCompleted(true);
        };

        socket.on("initialData", handleInitialData);
        socket.on("bidUpdate", handleBidUpdate);
        socket.on("playerUpdate", handlePlayerUpdate);
        socket.on("auctionUpdate", handleAuctionUpdate);
        socket.on("timerSync", handleTimerSync);
        socket.on("error", handleError);
        socket.on("auctionError", handleAuctionError);
        socket.on("viewerCount", handleViewerCount);
        socket.on("userPoll", handleUserPoll);
        socket.on("pollTimerUpdate", handlePollTimer);
        socket.on("pollCompleted", handlePollComplete);

        return () => {
            socket.off("initialData", handleInitialData);
            socket.off("bidUpdate", handleBidUpdate);
            socket.off("playerUpdate", handlePlayerUpdate);
            socket.off("auctionUpdate", handleAuctionUpdate);
            socket.off("timerSync", handleTimerSync);
            socket.off("error", handleError);
            socket.off("auctionError", handleAuctionError);
            socket.off("viewerCount", handleViewerCount);
            socket.off("userPoll", handleUserPoll);
            socket.off("pollTimerUpdate", handlePollTimer);
            socket.off("pollCompleted", handlePollComplete);
        };
    }, [socket, id, playBidSound, showNotification, auctionData?.settings?.minBidIncrement, user]);

    useEffect(() => {
        if (minimumBid > 0) {
            setCustomBid(minimumBid);
        }
    }, [minimumBid]);

    const [placeBid, { isLoading: isBiddingLoading }] = usePlacebidMutation();

    const handleBid = async (increment) => {
        const newBidAmount = customBidMode
            ? increment
            : auctionData.currentBid?.amount !== undefined
            ? auctionData.currentBid.amount + increment
            : (currentPlayer?.player?.basePrice || 0) + increment; // same as the amount shown on the quick-bid button

        if (newBidAmount <= (auctionData?.currentBid?.amount || 0)) {
            setErrorMessage("Bid amount must be higher than current bid");
            playBidSound(bidError);
            return;
        }

        try {
            const response = await placeBid({
                playerId: currentPlayer?.player?._id,
                teamId: user.team._id,
                auctionId: auctionData._id,
                amount: newBidAmount,
                bidType: "normal",
            });

            if (!response.data?.success) {
                throw new Error(response.error?.data?.message || "Failed to place bid");
            }

            setSuccessMessage(response.data.message);
            setTimeout(() => setSuccessMessage(""), 5000);
            setErrorMessage("");
            setCustomBid(newBidAmount + (auctionData?.settings?.minBidIncrement || 0));
            playBidSound(bidSuccess);
        } catch (error) {
            setErrorMessage(error.message || "An error occurred");
            setTimeout(() => setErrorMessage(""), 5000);
            toast.error(error.message || "Your bid could not be placed");
            playBidSound(bidError);
        }
    };

    const handleSubmitPoll = async () => {
        try {
            socket.emit("submitPollVote", { auctionId: id, playerIds: selectedPlayers, userId: user._id });
            setHasVoted(true);
            toast.success("Your vote is in");
        } catch (error) {
            toast.error("Failed to submit votes. Please try again.");
        }
    };

    const handleStop = async () => {
        try {
            const res = await stopAuction({ auctioneerId: user._id, auctionId: id });
            if (res.data?.success) {
                setAuctionData((prev) => ({
                    ...prev,
                    status: "paused",
                }));
                // socket.emit("auctionStatusUpdate", {
                //     auctionId: id,
                //     status: "paused",
                //     timeRemaining: auctionData.timeRemaining,
                // });
                toast.success("Auction paused");
            } else {
                toast.error(res.error?.data?.message || "Failed to pause auction");
            }
        } catch (error) {
            toast.error(error.data?.message || "An error occurred");
        }
    };

    const handleMakePoll = async () => {
        socket.emit("makePoll", { auctionId: id }, (response) => {
            if (response?.error) {
                toast.error("Failed to create poll");
            }
        });
    };

    const handleStart = async () => {
        try {
            const res = await startAuction({ auctioneerId: user._id, auctionId: id });
            if (res.data?.success) {
                setAuctionData((prev) => ({
                    ...prev,
                    ...res.data?.data,
                }));
                // socket.emit("auctionStatusUpdate", {
                //     auctionId: id,
                //     status: "active",
                //     timeRemaining: auctionData.timeRemaining || auctionData.settings.bidTimeLimit,
                // });
                toast.success("Auction resumed");
            } else {
                toast.error(res.error?.data?.message || "Failed to resume auction");
            }
        } catch (error) {
            toast.error(error.data?.message || "An error occurred");
        }
    };

    const handleCompleteAuction = async () => {
        try {
            const res = await completeAuction({ auctioneerId: user._id, auctionId: id });
            if (res.data?.success) {
                socket.emit("completeAuction", { auctionId: id, auctioneerId: user._id });
                toast.success("Auction completed");
            } else {
                toast.error(res.error?.data?.message || "Failed to complete auction");
            }
        } catch (error) {
            toast.error(error.data?.message || "An error occurred");
        }
    };

    const handleMovetoNextPlayer = async () => {
        try {
            socket.emit("requestNextPlayer", { auctionId: id });
            toast.success("Moving to next player");
        } catch (error) {
            toast.error("Failed to move to next player");
        }
    };

    const handleUndoLastBid = () => {
        if (!auctionData?.currentBid) {
            toast.error("There is no bid to undo");
            return;
        }
        setUndoOpen(true);
    };

    const confirmUndoLastBid = () => {
        socket.emit("undoLastBid", { auctionId: id });
        toast.success("Undoing the last bid");
    };

    const handleSkipPlayer = async () => {
        try {
            socket.emit("skipPlayer", { auctionId: id });
            toast.success("Skipping player");
        } catch (error) {
            toast.error("Failed to skip player");
        }
    };

    const handleMarkPlayerAsSold = async () => {
        if (!currentPlayer?.player || !auctionData.currentBid) {
            toast.error("No active bid to mark as sold");
            return;
        }
        try {
            socket.emit("playerSold", {
                auctionId: id,
                playerId: currentPlayer.player._id,
                teamId: auctionData.currentBid.team._id,
                amount: auctionData.currentBid.amount,
            });
            toast.success(`Player ${currentPlayer.player.name} marked as sold`);
        } catch (error) {
            toast.error("Failed to mark player as sold");
        }
    };

    const handlePlayerSelection = (playerId, isChecked) => {
        setSelectedPlayers((prev) => (isChecked ? [...prev, playerId] : prev.filter((id) => id !== playerId)));
    };

    const handleSelectAll = (isChecked) => {
        setSelectedPlayers(isChecked ? unsoldPlayers.map((player) => player._id) : []);
    };

    // Error states
    if (err) {
        return <ErrorState kind="server" title="Couldn't load this auction" hint={err} backTo="/auctions" backLabel="Back to auctions" />;
    }

    if (loading) {
        return <LoadSpinner fullScreen />;
    }

    if (!auctionData) {
        return <ErrorState error={{ status: 404 }} what="auction" backTo="/auctions" backLabel="Back to auctions" />;
    }

    if (auctionData.status === "completed") {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 to-slate-100">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4"
                >
                    <div className="flex flex-col items-center">
                        <div className="bg-green-100 p-4 rounded-full mb-6">
                            <CheckCircle className="w-12 h-12 text-green-600" />
                        </div>
                        <h2 className="font-display text-2xl font-semibold tracking-tight text-navy-900">Auction completed</h2>
                        <p className="mb-6 mt-2 text-center text-slate-600">{auctionData?.name ? `${auctionData.name} has finished.` : "This auction has finished."} Final results are archived.</p>
                        <div className="w-full border-t border-gray-200 my-4"></div>
                        <div className="grid grid-cols-2 gap-4 w-full mb-6">
                            <div className="text-center">
                                <p className="text-sm text-slate-500">Players sold</p>
                                <p className="font-semibold text-navy-900">{auctionData?.results?.length ?? 0}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-slate-500">Season</p>
                                <p className="font-semibold text-navy-900">{auctionData?.season ?? "—"}</p>
                            </div>
                        </div>
                        <div className="flex gap-4 w-full">
                            <Button
                                className="w-full bg-navy-700 hover:bg-navy-800 text-white py-3 rounded-lg"
                                onClick={() => navigate(`/auction/cpltd/${id}`)}
                            >
                                View Results
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50"
                                onClick={() => navigate("/auctions")}
                            >
                                All auctions
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (
        (!user || user.role === "user") &&
        (auctionData.status === "scheduled" || auctionData.status === "completed" || auctionData.status === "cancelled")
    ) {
        return (
            <AuctionNotStarted
                startTime={auctionData?.startTime}
                endTime={auctionData?.endTime}
                status={auctionData?.status}
            />
        );
    }

    if (canControl && auctionData?.status === "scheduled") {
        return (
            <AuctionNotStarted
                startTime={auctionData?.startTime}
                endTime={auctionData?.endTime}
                status={auctionData?.status}
            />
        );
    }

    return (
        <div className="min-h-screen max-w-7xl bg-slate-50 container mx-auto px-4 sm:px-6 space-y-6">
            <div className="container mx-auto px-4 sm:px-6 space-y-6">
                {!user && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-gray-700">
                        <span>
                            You&apos;re watching as a spectator.{" "}
                            <Link to="/login" state={{ from: { pathname: `/auction/${id}` } }} className="font-semibold text-navy-700 hover:underline">
                                Sign in
                            </Link>{" "}
                            as a team owner to bid.
                        </span>
                        <Link to={`/auction/${id}/screen`} className="inline-flex items-center gap-1 font-medium text-navy-700 hover:underline">
                            <Monitor className="h-4 w-4" /> Big screen view
                        </Link>
                    </div>
                )}
                {/* Top Control Bar */}
                <div className="pt-4">
                    <Card className="bg-white/90 backdrop-blur-sm shadow-sm border-gray-200">
                        <CardContent className="p-2 flex flex-col sm:flex-row justify-between items-center gap-2">
                            <div className="flex items-center gap-3">
                                <ConfirmDialog
                                                    open={undoOpen}
                                                    onOpenChange={setUndoOpen}
                                                    title="Undo the latest bid?"
                                                    description="The previous bid becomes the current bid again. Everyone sees the change straight away."
                                                    confirmLabel="Undo bid"
                                                    onConfirm={confirmUndoLastBid}
                                                />
                                                <Button
                                    variant={notifications ? "default" : "outline"}
                                    size="icon"
                                    onClick={() => {
                                        if (!notifications && Notification.permission !== "granted") {
                                            Notification.requestPermission();
                                        }
                                        setNotifications(!notifications);
                                    }}
                                    className="rounded-full h-10 w-10"
                                    aria-label={notifications ? "Disable notifications" : "Enable notifications"}
                                >
                                    <Bell className={`w-5 h-5 ${notifications ? "text-white" : "text-gray-500"}`} />
                                </Button>
                            </div>

                            <div className="w-full flex items-center p-4">
                                <div className="flex items-center">
                                    <div
                                        className={`w-3 h-3 rounded-full ${
                                            auctionData.status === "active" ? "bg-green-500" : "bg-gray-300"
                                        } mr-2 animate-pulse`}
                                    ></div>
                                    <span
                                        className={`text-sm font-medium whitespace-nowrap ${
                                            auctionData.status === "active" ? "text-green-500" : "text-gray-500"
                                        }`}
                                    >
                                        {auctionData.status === "active" ? "Live Auction" : auctionData.status === "waiting" ? "Owners' vote" : auctionData.status === "completed" ? "Completed" : "Auction Paused"}
                                    </span>
                                </div>
                                <div className="ml-auto flex flex-wrap items-center justify-center gap-2 sm:gap-4">
                                    <div className="flex items-center gap-2 bg-gray-100 px-2 py-1 sm:px-4 sm:py-2 rounded-full">
                                        <Users className="w-4 h-4 text-blue-500 mr-1" />
                                        <span className="text-sm font-medium">
                                            {auctionData?.teams?.length} Bidders
                                        </span>
                                    </div>

                                    {viewerCount > 0 && (
                                        <div
                                            className="flex items-center gap-2 bg-gray-100 px-2 py-1 sm:px-4 sm:py-2 rounded-full"
                                            title="People watching this auction right now"
                                        >
                                            <Eye className="w-4 h-4 text-emerald-500 mr-1" />
                                            <span className="text-sm font-medium">{viewerCount} watching</span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 bg-gray-100 px-2 py-1 sm:px-4 sm:py-2 rounded-full">
                                        <Activity className="w-4 h-4 text-purple-500 mr-1" />
                                        <span className="text-sm font-medium">{recBids?.length} Bids</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {!connected && (
                    <div role="alert" className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <WifiOff className="h-5 w-5 flex-none" />
                        <span>
                            <strong>Connection lost.</strong> Reconnecting… You can&apos;t bid until it&apos;s back, and what you see may be out of date.
                        </span>
                    </div>
                )}

                {/* Alerts */}
                <AnimatePresence>
                    {successMessage && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Alert variant="default" className="border-green-500 bg-green-50">
                                <div className="flex items-center gap-3">
                                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                                    <div>
                                        <AlertTitle className="text-green-700">Success</AlertTitle>
                                        <AlertDescription className="text-green-600">{successMessage}</AlertDescription>
                                    </div>
                                </div>
                            </Alert>
                        </motion.div>
                    )}

                    {errorMessage && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Alert variant="destructive" className="border-red-500 bg-red-50">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                    <div>
                                        <AlertTitle className="text-red-700">Error</AlertTitle>
                                        <AlertDescription className="text-red-600">{errorMessage}</AlertDescription>
                                    </div>
                                </div>
                            </Alert>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:grid-rows-[auto_1fr]">
                    {/* Player Card */}
                    <div className="order-1 lg:order-none lg:col-span-4 lg:col-start-9 lg:row-start-1">

<Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200 shadow-lg">
                        <CardContent className="p-4">
                            {/* <CountdownTimer
                                timeRemaining={pollTimer || auctionData?.timeRemaining || 0}
                                status={auctionData?.status}
                            /> */}
                            {pollData && auctionData?.status === "waiting" ? (
                                <CountdownTimer2 timer={pollTimer} />
                            ) : auctionData?.status === "active" && !auctionData?.currentPlayer ? (
                                <div className="rounded-xl bg-gradient-to-br from-navy-700 to-navy-900 p-5 text-center shadow-md">
                                    <span className="text-xs font-medium text-white/80">NEXT PLAYER</span>
                                    <p className="mt-1 text-xl font-bold text-gold-300">Coming up…</p>
                                </div>
                            ) : (
                                <CountdownTimer
                                    time={auctionData?.timeRemaining}
                                    status={auctionData?.status}
                                    serverTime={timerData?.serverTime}
                                />
                            )}
                            {/* <CountdownTimer timer={timerData?.timeRemaining || 0} /> */}
                            <LiveCues auction={auctionData} timerData={timerData} />
                        </CardContent>
                    </Card>
                        </div>
                    <div className="order-2 lg:order-none lg:col-span-8 lg:row-span-2 lg:row-start-1 space-y-6">
                        {currentPlayer?.player ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100"
                            >
                                {/* Player header: photo, name and the three numbers that matter */}
                                <div className="flex flex-col sm:flex-row gap-5 bg-gradient-to-r from-navy-900 to-navy-700 p-5 text-white">
                                    <div className="h-32 w-24 flex-none overflow-hidden rounded-xl border-2 border-gold-400 bg-navy-800 shadow-lg mx-auto sm:mx-0">
                                        <img
                                            src={currentPlayer?.player?.image}
                                            alt={currentPlayer?.player?.name}
                                            className="h-full w-full object-cover object-top"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = "/placeholder-player.jpg";
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0 text-center sm:text-left">
                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                            <span className="rounded-full bg-gold-400 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-navy-900">
                                                {currentPlayer?.player?.role}
                                            </span>
                                            {currentPlayer?.player?.isUncapped && (
                                                <span className="flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">
                                                    <Sparkles className="mr-1 h-3 w-3" /> Uncapped
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight">
                                            {currentPlayer?.player?.name || "Unknown Player"}
                                        </h2>
                                        <p className="text-sm text-white/70">
                                            {currentPlayer?.player?.nationality || "International"} •{" "}
                                            {currentPlayer?.player?.dateOfBirth
                                                ? new Date().getFullYear() -
                                                  new Date(currentPlayer?.player?.dateOfBirth).getFullYear()
                                                : "N/A"}{" "}
                                            yrs
                                        </p>
                                        <div className="mt-3 grid grid-cols-3 gap-3 max-w-md mx-auto sm:mx-0">
                                            {[
                                                ["Matches", currentPlayer?.player?.matches || 0],
                                                ["Runs", currentPlayer?.player?.battingStats?.runs || 0],
                                                ["Wickets", currentPlayer?.player?.bowlingStats?.wickets || 0],
                                            ].map(([label, value]) => (
                                                <div key={label} className="rounded-lg bg-white/10 px-3 py-1.5">
                                                    <p className="text-[11px] uppercase tracking-wide text-white/60">{label}</p>
                                                    <p className="text-lg font-bold">{value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5">
                                    <div className="flex flex-col md:flex-row gap-6">
                                        <div className="flex-1 space-y-5">
                                            {/* Bid Cards */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <motion.div
                                                    whileHover={{ scale: 1.02 }}
                                                    // className="bg-slate-50 p-4 rounded-xl border border-slate-200"
                                                    className="bg-gradient-to-br from-navy-700 to-navy-900 p-3 rounded-lg text-white shadow-sm"
                                                >
                                                    <p className="text-xs font-medium text-white">Base Price</p>
                                                    <p className="text-xl font-bold text-white">
                                                        {formatCurrency(currentPlayer?.player?.basePrice)}
                                                    </p>
                                                </motion.div>
                                                <motion.div
                                                    whileHover={{ scale: 1.02 }}
                                                    // className="bg-green-50 p-4 rounded-xl border border-green-100"
                                                    className="bg-gradient-to-br from-gold-300 to-gold-500 p-3 rounded-lg text-navy-900 shadow-sm"
                                                >
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-navy-800">Current bid</p>
                                                    <p className="text-3xl font-extrabold text-navy-900">
                                                        {auctionData.currentBid?.amount
                                                            ? formatCurrency(auctionData?.currentBid?.amount)
                                                            : formatCurrency(currentPlayer?.player?.basePrice || 0)}
                                                    </p>
                                                    {auctionData.currentBid?.bidder && (
                                                        <p className="text-xs font-medium text-navy-800 mt-1 flex items-center">
                                                            <User className="w-3 h-3 mr-1" />
                                                            {auctionData.currentBid.bidder.name || "N/A"}
                                                        </p>
                                                    )}
                                                </motion.div>
                                            </div>

                                            
                                        </div>
                                    </div>

                                    {/* Bidding Controls - User View */}
                                    {user?.role === "user" && (
                                        <div className="mt-6 rounded-xl border border-gray-200 p-4 bg-gradient-to-b from-gray-50 to-white">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-lg font-semibold text-gray-800">Place Your Bid</h3>
                                                <button
                                                    onClick={() => setCustomBidMode(!customBidMode)}
                                                    className={`px-3 py-1 text-sm font-medium rounded-full transition-all 
                                                 ${
                                                     customBidMode
                                                         ? "bg-gold-300/30 text-navy-800"
                                                         : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                 }`}
                                                >
                                                    {customBidMode ? "Quick Bid" : "Custom Bid"}
                                                </button>
                                            </div>

                                            {isLeading && (
                                                <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                                                    Your team holds the highest bid. You can bid again once someone outbids you.
                                                </p>
                                            )}

                                            {!customBidMode ? (
                                                <div className="grid grid-cols-3 gap-3">
                                                    {[1, 2, 5].map((multiplier) => {
                                                        const bidAmount =
                                                            auctionData.currentBid == null
                                                                ? (currentPlayer.player.basePrice || 0) +
                                                                  auctionData.settings.minBidIncrement * multiplier
                                                                : auctionData.currentBid.amount +
                                                                  auctionData?.settings?.minBidIncrement * multiplier;

                                                        return (
                                                            <motion.button
                                                                key={multiplier}
                                                                whileHover={{ scale: 1.03 }}
                                                                whileTap={{ scale: 0.97 }}
                                                                disabled={isLeading || !connected}
                                                                className={`py-3 px-2 rounded-xl text-center transition-all border-2 disabled:cursor-not-allowed disabled:opacity-50
                           ${
                               multiplier === 1
                                   ? "bg-gold-300/20 border-gold-300 hover:bg-gold-300/40"
                                   : multiplier === 2
                                   ? "bg-gold-300/20 border-gold-300 hover:bg-gold-300/40"
                                   : "bg-gold-300/20 border-gold-300 hover:bg-gold-300/40"
                           }`}
                                                                onClick={() =>
                                                                    handleBid(
                                                                        auctionData?.settings?.minBidIncrement *
                                                                            multiplier
                                                                    )
                                                                }
                                                            >
                                                                <div className="mb-1 flex justify-center">
                                                                    {multiplier === 1 ? (
                                                                        <span className="text-xs font-medium text-navy-600">
                                                                            +
                                                                            {formatCurrency(
                                                                                auctionData?.settings?.minBidIncrement
                                                                            )}
                                                                        </span>
                                                                    ) : (
                                                                        <span
                                                                            className={`text-xs font-medium ${
                                                                                multiplier === 2
                                                                                    ? "text-navy-600"
                                                                                    : "text-navy-600"
                                                                            }`}
                                                                        >
                                                                            +{multiplier}x
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p
                                                                    className={`font-bold ${
                                                                        multiplier === 1
                                                                            ? "text-navy-800"
                                                                            : multiplier === 2
                                                                            ? "text-navy-800"
                                                                            : "text-navy-800"
                                                                    }`}
                                                                >
                                                                    {formatCurrency(bidAmount)}
                                                                </p>
                                                            </motion.button>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="relative flex items-center border-2 border-slate-200 rounded-xl focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100 transition-all">
                                                        <div className="pl-4 text-blue-500">
                                                            <DollarSign className="w-5 h-5" />
                                                        </div>
                                                        <input
                                                            type="number"
                                                            className="w-full p-3 text-lg font-medium border-0 focus:ring-0 bg-transparent"
                                                            value={customBid}
                                                            onChange={(e) => setCustomBid(Number(e.target.value))}
                                                            min={minimumBid}
                                                            step={auctionData?.settings?.minBidIncrement}
                                                            aria-label="Custom bid amount"
                                                        />
                                                    </div>

                                                    <div className="flex items-center gap-2 ps-1">
                                                        <p className="text-sm text-gray-600">Minimum bid:</p>
                                                        <span
                                                            className="font-semibold text-navy-600 cursor-pointer hover:underline"
                                                            onClick={() => setCustomBid(minimumBid)}
                                                        >
                                                            {formatCurrency(minimumBid)}
                                                        </span>
                                                    </div>

                                                    <motion.button
                                                        className="w-full py-3 text-lg font-semibold text-white bg-gradient-to-r from-navy-700 to-navy-900
                       hover:from-navy-700 hover:to-navy-900 rounded-xl shadow-md transition-all"
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => handleBid(customBid)}
                                                        disabled={isBiddingLoading || isLeading || !connected}
                                                    >
                                                        {isBiddingLoading ? (
                                                            <span className="flex items-center justify-center">
                                                                <span className="w-5 h-5 border-4 border-t-transparent border-white rounded-full animate-spin mr-2"></span>
                                                                Processing...
                                                            </span>
                                                        ) : (
                                                            "Place Bid"
                                                        )}
                                                    </motion.button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Auctioneer Controls */}
                                    {canControl && (
                                        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                                                <h3 className="font-display text-lg font-semibold tracking-tight text-navy-900">Auction controls</h3>
                                                <p className="text-xs text-slate-500">The clock sells each player on its own. Use these only to step in.</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                                                {auctionData.status === "active" ? (
                                                    <button className="flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 bg-gold-400 text-navy-900 hover:bg-gold-300" onClick={handleStop} title="Freeze the clock for everyone">
                                                        <Clock className="h-4 w-4" /> Pause
                                                    </button>
                                                ) : auctionData.status === "paused" ? (
                                                    <button className="flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleStart} title="Carry on from where the clock stopped">
                                                        <Clock className="h-4 w-4" /> Resume
                                                    </button>
                                                ) : (
                                                    <div className="flex h-12 items-center justify-center rounded-lg border border-dashed border-slate-300 px-2 text-center text-xs capitalize text-slate-500">
                                                        {auctionData.status === "waiting" ? "Waiting for the vote" : auctionData.status}
                                                    </div>
                                                )}

                                                <button className="flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 bg-navy-900 text-white hover:bg-navy-800" onClick={handleMarkPlayerAsSold} title="Sell to the highest bidder now (unsold if nobody bid)">
                                                    <CheckCircle className="h-4 w-4" /> Sell now
                                                </button>

                                                <button className="flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 bg-navy-900 text-white hover:bg-navy-800" onClick={handleMovetoNextPlayer} title="Finish this player and bring up the next one">
                                                    <ArrowRight className="h-4 w-4" /> Next player
                                                </button>

                                                <button className="flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 border border-slate-300 bg-white text-slate-700 hover:bg-slate-100" onClick={handleSkipPlayer} title="Pass on this player without selling, ignoring any bid">
                                                    <XCircle className="h-4 w-4" /> Skip player
                                                </button>

                                                <button
                                                    className="flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 border border-red-300 bg-white text-red-600 hover:bg-red-50"
                                                    onClick={handleUndoLastBid}
                                                    disabled={!auctionData?.currentBid}
                                                    title="Remove the latest bid on this player"
                                                >
                                                    <RotateCcw className="h-4 w-4" /> Undo bid
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <Card className="p-6 flex flex-col items-center justify-center h-64 bg-white shadow-xl border-gray-200">
                                {comingUp && (
                                    <div className="flex flex-col items-center gap-3 text-center">
                                        <div className="rounded-full bg-navy-900 p-4 text-gold-400">
                                            <Trophy className="h-8 w-8" />
                                        </div>
                                        <p className="font-display text-xl font-semibold tracking-tight text-navy-900">Next player coming up…</p>
                                        <p className="text-sm text-slate-500">The result is on screen; bidding opens in a moment.</p>
                                    </div>
                                )}
                                {!comingUp && user?.role === "user" && (
                                    <div className="flex flex-col gap-4 items-center text-center">
                                        <div className="bg-gray-100 p-4 rounded-full">
                                            <Users className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="text-gray-600 max-w-md">
                                            {pollData
                                                ? hasVoted
                                                    ? "Your vote is in. Players with at least one vote come back for another round when voting closes."
                                                    : "Vote for the unsold players you want back in the auction. Players with at least one vote come back for one more round."
                                                : "No player is currently available for bidding"}
                                        </p>
                                        {pollData && pollTimer > 0 && (
                                            <p className="text-sm font-semibold text-navy-700">Voting closes in {pollTimer}s</p>
                                        )}
                                        <div className="flex gap-3">
                                            {pollData && !hasVoted && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button className="bg-green-600 hover:bg-green-700 text-white">
                                                            Vote Now
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="max-w-4xl">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="text-xl">
                                                                Vote for Unsold Players
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Select the players you want brought back for one more round.
                                                                {pollTimer > 0 ? ` Voting closes in ${pollTimer}s.` : " Voting has closed."}
                                                                {selectedPlayers.length === 0 && " Pick at least one player to submit, or close this window to skip."}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>

                                                        <div className="max-h-[60vh] overflow-y-auto">
                                                            <Table>
                                                                <TableHeader className="sticky top-0 bg-white z-10">
                                                                    <TableRow>
                                                                        <TableHead className="w-12">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="w-4 h-4 rounded border-gray-300 text-navy-600 focus:ring-blue-500"
                                                                                checked={
                                                                                    selectedPlayers.length ===
                                                                                    unsoldPlayers.length
                                                                                }
                                                                                onChange={(e) =>
                                                                                    handleSelectAll(e.target.checked)
                                                                                }
                                                                            />
                                                                        </TableHead>
                                                                        <TableHead>Player</TableHead>
                                                                        <TableHead className="text-right">
                                                                            Base Price
                                                                        </TableHead>
                                                                        <TableHead>Role</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {unsoldPlayers.map((player) => (
                                                                        <TableRow
                                                                            key={player._id}
                                                                            className="hover:bg-gray-50"
                                                                        >
                                                                            <TableCell>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    className="w-4 h-4 rounded border-gray-300 text-navy-600 focus:ring-blue-500"
                                                                                    checked={selectedPlayers.includes(
                                                                                        player._id
                                                                                    )}
                                                                                    onChange={(e) =>
                                                                                        handlePlayerSelection(
                                                                                            player._id,
                                                                                            e.target.checked
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </TableCell>
                                                                            <TableCell className="flex items-center gap-3">
                                                                                <Avatar className="w-10 h-10 rounded-full border border-gray-200">
                                                                                    <AvatarImage
                                                                                        src={player?.player?.image}
                                                                                        alt={player?.player?.name}
                                                                                        className="object-cover"
                                                                                    />
                                                                                    <AvatarFallback className="bg-gray-200 text-gray-700">
                                                                                        {player?.player?.name?.charAt(
                                                                                            0
                                                                                        ) || "P"}
                                                                                    </AvatarFallback>
                                                                                </Avatar>
                                                                                <span className="font-medium">
                                                                                    {player?.player?.name}
                                                                                </span>
                                                                            </TableCell>
                                                                            <TableCell className="text-right font-medium">
                                                                                {formatCurrency(
                                                                                    player?.player?.basePrice
                                                                                )}
                                                                            </TableCell>
                                                                            <TableCell className="capitalize">
                                                                                {player?.player?.role}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>

                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="border-gray-300 hover:bg-gray-50">
                                                                Cancel
                                                            </AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={handleSubmitPoll}
                                                                disabled={selectedPlayers.length === 0}
                                                                className="bg-navy-700 hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                Submit Votes
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {!comingUp && canControl && (
                                    <div className="flex flex-col gap-4 items-center text-center">
                                        <div className="bg-gray-100 p-4 rounded-full">
                                            <Trophy className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="text-gray-600 max-w-md">
                                            {isCompleted
                                                ? "Auction completed successfully"
                                                : "All set of players are completed"}
                                        </p>
                                        <MakePollButton
                                            handleMakePoll={handleMakePoll}
                                            cooldownDuration={pollTimer}
                                            status={pollData}
                                            totalVotes={totalVotes}
                                            handleStart={handleStart}
                                            isCompleted={isCompleted}
                                            unsoldPlayers={unsoldPlayers}
                                            pendingPlayers={pendingPlayers}
                                            handleCompleteAuction={handleCompleteAuction}
                                        />
                                    </div>
                                )}
                            </Card>
                        )}

                        {currentPlayer?.player && (
                            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
<div className="border border-gray-100 rounded-xl overflow-hidden">
                                                <button
                                                    className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                                                    onClick={() => setShowStatsDetail(!showStatsDetail)}
                                                >
                                                    <span className="font-medium text-gray-700">
                                                        Detailed Statistics
                                                    </span>
                                                    {showStatsDetail ? (
                                                        <ChevronUp className="w-5 h-5 text-gray-500" />
                                                    ) : (
                                                        <ChevronDown className="w-5 h-5 text-gray-500" />
                                                    )}
                                                </button>

                                                {showStatsDetail && (
                                                    <PlayerStatsSection player={currentPlayer?.player} />
                                                )}
                                            </div>
                            </div>
                        )}

                        {/* Player Status Tabs */}
                        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                            <Tabs defaultValue="sold" className="w-full bg-transparent rounded-none">
                                <TabsList className="flex justify-start bg-transparent rounded-none p-0 h-auto border-b border-gray-100">
                                    <TabsTrigger
                                        value="sold"
                                        className="p-4 rounded-none data-[state=active]:border-blue-500 data-[state=active]:bg-none data-[state=active]:shadow-none data-[state=active]:border-b-2  hover:bg-slate-100"
                                    >
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                            <span>Sold</span>
                                        </div>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="unsold"
                                        className="p-4 rounded-none data-[state=active]:border-blue-500 data-[state=active]:bg-none data-[state=active]:shadow-none data-[state=active]:border-b-2 hover:bg-slate-100"
                                    >
                                        <div className="flex items-center gap-2">
                                            <XCircle className="w-4 h-4 text-red-500" />
                                            <span>Unsold</span>
                                        </div>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="upcoming"
                                        className=" p-4 rounded-none data-[state=active]:border-blue-500 data-[state=active]:bg-none data-[state=active]:shadow-none data-[state=active]:border-b-2 hover:bg-slate-100"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-blue-500" />
                                            <span>Upcoming</span>
                                        </div>
                                    </TabsTrigger>
                                </TabsList>
                                <TrackPlayersByStatus auctionData={auctionData} />
                            </Tabs>
                        </div>
                    </div>

                    {/* Recent Bids Panel */}
                    <div className="order-3 lg:order-none lg:col-span-4 lg:col-start-9 lg:row-start-2">
                        
                        {/* Live Bidding Panel */}
                        <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100 sticky top-6">
                            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-4 flex items-center">
                                <div className="flex items-center">
                                    <Trophy className="w-5 h-5 text-white mr-2" />
                                    <span className="text-white font-bold">Live Bidding</span>
                                </div>

                                <div className="ml-auto bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                                    <span className="text-xs font-medium text-white">{recBids?.length} bids</span>
                                </div>
                            </div>

                            <div className="h-[70vh] overflow-y-auto">
                                {recBids?.length > 0 ? (
                                    <AnimatePresence>
                                        <div className="divide-y divide-gray-100">
                                            {recBids.map((bid, index) => {
                                                return (
                                                    <motion.div
                                                        key={bid._id || index}
                                                        initial={{ opacity: 0, y: -20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                        className={`p-4 ${index === 0 ? "bg-green-50" : ""}`}
                                                    >
                                                        <div className="flex items-center justify-between gap-4 py-2">
                                                            {/* Team Logo */}
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-gold-300/30 rounded-full flex items-center justify-center overflow-hidden">
                                                                    {bid.team?.logo ? (
                                                                        <img
                                                                            src={bid.team.logo}
                                                                            alt={bid.team.name}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-navy-600 font-bold">
                                                                            {bid.team?.name?.charAt(0) || "?"}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Team Info */}
                                                                <div className="min-w-0">
                                                                    <p className="font-medium text-sm text-gray-800 truncate w-32">
                                                                        <abbr
                                                                            title={bid.team?.name}
                                                                            className="no-underline cursor-pointer"
                                                                            style={{
                                                                                textDecoration: "none",
                                                                                borderBottom: "none",
                                                                            }}
                                                                        >
                                                                            {bid.team?.name || "Anonymous"}
                                                                        </abbr>
                                                                    </p>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs text-gray-500">
                                                                            {bid.team?.shortName}
                                                                        </span>
                                                                        {index === 0 && (
                                                                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                                                                Highest
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Bid Info */}
                                                            <div className="text-right">
                                                                <p className="font-bold text-green-700 text-sm">
                                                                    {formatCurrency(bid.amount)}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    {new Date(bid.timestamp).toLocaleTimeString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </AnimatePresence>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                            <Wallet className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="font-medium text-gray-700">No bids yet</p>
                                        <p className="text-sm text-gray-500">{user?.role === "user" ? "Be the first to place a bid!" : "Waiting for the first bid."}</p>
                                    </div>
                                )}
                            </div>

                            {/* Bid Summary Card */}
                            {recBids?.length > 0 && (
                                <div className="border-t border-gray-100 p-4 bg-gray-50">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Bid Summary</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500">Highest Bid</p>
                                            <p className="font-bold text-green-700">
                                                {formatCurrency(recBids[0]?.amount || 0)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Total Bidders</p>
                                            <p className="font-medium text-gray-800">
                                                {new Set(recBids.map((bid) => bid.team?._id || bid.team?.name || bid.bidder?._id)).size}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Team Budget Card (Only visible for team users) */}
                        {user?.role === "user" && (
                            <div className="mt-6 bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                                <div className="p-4 border-b">
                                    <h3 className="font-semibold text-gray-800 flex items-center">
                                        <DollarSign className="w-4 h-4 text-green-500 mr-2" />
                                        Your Team Budget
                                    </h3>
                                </div>
                                <div className="p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-sm text-gray-600">Total Budget</p>

                                        <p className="font-bold text-gray-800">
                                            {formatCurrency(auctionData.settings?.maxPursePerTeam)}
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-sm text-gray-600">Spent</p>
                                        <p className="font-medium text-red-600">
                                            {formatCurrency(auctionData.settings?.maxPursePerTeam - purseRemaining)}
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-center mb-4">
                                        <p className="text-sm text-gray-600">Remaining</p>
                                        <p className="font-bold text-green-600">{formatCurrency(purseRemaining)}</p>
                                    </div>

                                    {/* Budget progress bar */}
                                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-green-500 to-green-300 rounded-full"
                                            style={{
                                                width:
                                                    (purseRemaining / auctionData.settings?.maxPursePerTeam) * 100 +
                                                    "%",
                                            }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-center text-gray-500 mt-1">
                                        {((purseRemaining / auctionData.settings?.maxPursePerTeam) * 100).toFixed(2)}%
                                        budget remaining
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Team Composition Card (Only visible for team users) */}
                        {user?.role === "user" && (
                            <div className="mt-6 bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                                <div className="p-4 border-b">
                                    <h3 className="font-semibold text-gray-800 flex items-center">
                                        <Users className="w-4 h-4 text-blue-500 mr-2" />
                                        Your Team Composition
                                    </h3>
                                </div>
                                <div className="p-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            ["Batsmen", teamComposition.batsman],
                                            ["Bowlers", teamComposition.bowler],
                                            ["All-rounders", teamComposition["all-rounder"]],
                                            ["Wicket-keepers", (teamComposition["wicket-keeper-batsman"] || 0) + (teamComposition["wicket-keeper"] || 0)],
                                        ].map(([label, count]) => (
                                            <div key={label} className="rounded-lg bg-slate-50 p-3 text-center">
                                                <p className="text-xs font-medium text-slate-500">{label}</p>
                                                <p className="mt-0.5 text-xl font-bold text-navy-900">{count || 0}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-4">
                                        <p className="text-sm font-medium text-gray-700 mb-2">Squad rules</p>
                                        <ul className="text-xs text-gray-600 space-y-1">
                                            <li className="flex items-center">
                                                <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                                                {`Squad of ${auctionData?.settings?.minSquadSize}–${auctionData?.settings?.maxSquadSize} players`}
                                            </li>
                                            <li className="flex items-center">
                                                <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                                                {`At most ${auctionData?.settings?.maxOverseasPlayers} overseas players`}
                                            </li>
                                            <li className="flex items-center">
                                                <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                                                {"Keep enough purse to fill the minimum squad"}
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveAuctionPage;
