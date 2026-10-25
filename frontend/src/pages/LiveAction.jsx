import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Trophy,
    Clock,
    CheckCircle,
    XCircle,
    Bell,
    Volume2,
    VolumeX,
    Users,
    ArrowUp,
    Wallet,
    AlertTriangle,
    CheckCircleIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { useParams } from "react-router-dom";
import LoadSpinner from "../components/LoadSpinner.jsx";
import { usePlacebidMutation } from "../api/livebiddingApi.js";
import io from "socket.io-client";
import bidSuccess from "../assets/bid_sound1.mp3";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
// import {
//     DropdownMenu,
//     DropdownMenuContent,
//     DropdownMenuItem,
//     DropdownMenuLabel,
//     DropdownMenuSeparator,
//     DropdownMenuTrigger,
// } from "../components/ui/dropdown-menu";
import bidError from "../assets/bidError.mp3";
import AuctionNotStarted from "../components/AuctionNotStarted.jsx";
import PlayerStatsSection from "../components/PlayerStatsSection.jsx";
import TrackPlayersByStatus from "../components/TrackPlayersByStatus.jsx";
import { useSelector } from "react-redux";
import { useStopAuctionMutation, useStartAuctionMutation } from "../api/auctionApi.js";
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
import { API_ORIGIN } from "../config.js";

// Extracted to separate component
const CountdownTimer = ({ time, onTimeout }) => {
    const [isWarning, setIsWarning] = useState(false);

    useEffect(() => {
        setIsWarning(time <= 10);
        if (time <= 0) onTimeout();
    }, [time, onTimeout]);

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-red-500 to-orange-500 p-4 rounded-xl text-white text-center"
        >
            <p className="text-xs font-medium opacity-80">Time Remaining:</p>
            <p className={`text-3xl font-bold ${isWarning ? "animate-pulse text-white" : "text-white"}`}>
                {Math.max(time, 0)}s
            </p>
        </motion.div>
    );
};

// New component for bid buttons
const BidButton = ({ multiplier, bidAmount, onBid }) => (
    <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="h-20 bg-white border-2 border-slate-200 rounded-xl shadow-sm
            hover:shadow-lg hover:border-blue-300 transition-all duration-300"
        onClick={onBid}
    >
        <div className="space-y-1">
            <div className="text-xs text-navy-600 flex items-center justify-center gap-1">
                <ArrowUp className="w-4 h-4" />
                {multiplier}x Jump
            </div>
            <div className="font-bold text-gray-900">{bidAmount}</div>
        </div>
    </motion.button>
);

// Complete AuctioneerButtons component
const AuctioneerButtons = ({
    handleStop,
    handleStart,
    handleMovetoNextPlayer,
    handleMarkPlayerAsSold,
    status,
}) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4">
            {status === "paused" && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleStart}
                    className={`h-16 flex items-center justify-center px-4 py-2
                    text-white font-semibold rounded-lg shadow-md transition-all duration-300
                    bg-green-500 hover:bg-opacity-90 hover:shadow-lg`}
                >
                    <span className="text-lg">Start</span>
                </motion.button>
            )}
            {status === "active" && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleStop}
                    className={`h-16 flex items-center justify-center px-4 py-2
                        text-white font-semibold rounded-lg shadow-md transition-all duration-300
                        bg-red-500 hover:bg-opacity-90 hover:shadow-lg`}
                >
                    <span className="text-lg">Stop</span>
                </motion.button>
            )}

            {/* Add the missing buttons */}
            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`h-16 flex items-center justify-center px-4 py-2
                text-white font-semibold rounded-lg shadow-md transition-all duration-300
                bg-navy-600 hover:bg-opacity-90 hover:shadow-lg`}
            >
                <AlertDialog>
                    <AlertDialogTrigger>Next Player</AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Would you really like to mark the current player as sold or unsold and move to next
                                player?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleMovetoNextPlayer}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </motion.div>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleMarkPlayerAsSold}
                className={`h-16 flex items-center justify-center px-4 py-2
                    text-white font-semibold rounded-lg shadow-md transition-all duration-300
                    bg-yellow-500 hover:bg-opacity-90 hover:shadow-lg`}
            >
                <span className="text-lg">Mark as Sold</span>
            </motion.button>
        </div>
    );
};

// New component for bid history item
const BidHistoryItem = ({ bid, index, formatCurrency }) => (
    <motion.div
        key={index}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }} // Reduced delay for smoother UX
        className={`p-4 rounded-xl ${index % 2 === 0 ? "bg-gray-50" : "bg-white"}`}
    >
        <div className="flex items-center justify-around">
            <div className="flex items-center gap-3">
                <Avatar className="w-14 h-14 rounded-full ring-2 ring-offset-2 ring-blue-500 overflow-hidden flex items-center">
                    <AvatarImage src={bid.team?.logo} alt={bid.team?.shortName || "Team"} />
                    <AvatarFallback>{bid.team?.shortName?.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold text-gray-900">{bid.team.shortName}</p>
                    <p className="text-xs text-gray-500">{bid.formattedTime}</p>
                </div>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                {formatCurrency(bid.amount)}
            </span>
        </div>
    </motion.div>
);

// Utility functions extracted
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

const MakePollButton = ({ handleMakePoll, cooldownDuration }) => {
    return (
        <Button
            className="h-10 text-lg font-semibold bg-gradient-to-r from-navy-700 to-navy-900
                hover:from-navy-700 hover:to-navy-900 rounded-xl shadow-lg transition-all duration-300"
            onClick={handleMakePoll}
            disabled={cooldownDuration > 0}
        >
            {cooldownDuration > 0 ? `Wait ${cooldownDuration}s` : "Make Poll"}
        </Button>
    );
};

const LiveAuctionPage = () => {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [auctionData, setAuctionData] = useState(null);
    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [recBids, setRecBids] = useState([]);
    const [err, setErr] = useState("");
    const [customBidMode, setCustomBidMode] = useState(false);
    const [customBid, setCustomBid] = useState(0);
    const [notifications, setNotifications] = useState(false);
    const [sound, setSound] = useState(true);
    const [viewerCount, setViewerCount] = useState(0);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [socket, setSocket] = useState(null);

    const { user } = useSelector((state) => state.auth);
    const [stopAuction] = useStopAuctionMutation();
    const [startAuction] = useStartAuctionMutation();
    const [pollData, setPollData] = useState(false);
    const [unsoldPlayers, setUnsoldPlayers] = useState([]);
    const [pollTimer, setPollTimer] = useState(0);
    const [, setPollStartTime] = useState(null);

    const [selectedPlayers, setSelectedPlayers] = useState([]);

    // Using useMemo for derived values
    const minimumBid = useMemo(() => {
        if (!auctionData || !currentPlayer?.player) return 0;

        return auctionData.currentBid?.amount
            ? auctionData.currentBid.amount + auctionData.settings.minBidIncrement
            : currentPlayer.player.basePrice;
    }, [auctionData, currentPlayer]);

    const playBidSound = useCallback(
        (soundFile) => {
            if (sound) {
                const audio = new Audio(soundFile);
                audio.play().catch((err) => console.warn("Audio playback failed:", err));
            }
        },
        [sound]
    );

    // Handle individual checkbox changes
    const handlePlayerSelection = (playerId, isChecked) => {
        setSelectedPlayers(
            (prev) =>
                isChecked
                    ? [...prev, playerId] // Add player ID to the list
                    : prev.filter((id) => id !== playerId) // Remove player ID from the list
        );
    };

    // Handle "Select All" checkbox
    const handleSelectAll = (isChecked) => {
        setSelectedPlayers(
            isChecked
                ? unsoldPlayers.map((player) => player._id) // Select all player IDs
                : [] // Clear the selection
        );
    };

    const showNotification = useCallback(
        (message) => {
            if (notifications && "Notification" in window) {
                if (Notification.permission === "granted") {
                    new Notification("Cricket Auction Update", { body: message });
                } else if (Notification.permission !== "denied") {
                    Notification.requestPermission().then((permission) => {
                        if (permission === "granted") {
                            new Notification("Cricket Auction Update", { body: message });
                        }
                    });
                }
            }
        },
        [notifications]
    );

    // Handle socket connection and listeners
    useEffect(() => {
        const newSocket = io(API_ORIGIN, {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        newSocket.on("connect", () => {
            newSocket.emit("joinAuction", id, (response) => {
                if (response?.error) {
                    console.error("Failed to join auction:", response.error);
                }
            });
        });

        newSocket.on("disconnect", () => {
        });

        newSocket.on("connect_error", (error) => {
            console.error("WebSocket connection error:", error); // Debug log
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [id]);

    // Handle socket events separately for better organization
    useEffect(() => {
        if (!socket) return;

        const handleAuctionStatusUpdate = (data) => {
            console.llog("Hello");
            setAuctionData((prev) => ({
                ...prev,
                status: data.status,
                timeRemaining: data.timeRemaining,
            }));
        };

        // Initial connection setup
        const handleConnect = () => {
            socket.emit("joinAuction", id);
            socket.emit("fetchInitialData", { id });
        };

        const handleDisconnect = () => {
        };

        const handleReconnect = () => {
            socket.emit("fetchInitialData", { id });
            socket.emit("joinAuction", id);
        };

        const handleInitialData = ({ auction, currentPlayer, recentBids, error }) => {
            if (error) {
                setErr(error);
                return;
            }
            setAuctionData(auction);
            setCurrentPlayer(currentPlayer);
            setCustomBid(
                auction.currentBid?.amount
                    ? auction.currentBid.amount + auction.settings.minBidIncrement
                    : currentPlayer?.player?.basePrice || 0
            );
            setRecBids(recentBids);
            setLoading(false);
        };

        // Update handleBid in LiveAuctionPage

        const handleBidUpdate = (data) => {
            setAuctionData((prev) => ({
                ...prev,
                currentBid: data.updatedBid,
            }));
            setRecBids((prevBids) => [data.placedBid, ...prevBids]);
            setCustomBid(data.updatedBid.amount + (auctionData?.settings?.minBidIncrement || 0));
            playBidSound(bidSuccess);
            showNotification(`New bid: ${formatCurrency(data.updatedBid.amount)} by ${data.placedBid.team.shortName}`);
        };

        const handlePlayerUpdate = ({ currentPlayer }) => {
            setCurrentPlayer(currentPlayer);
            showNotification(`New player up for auction: ${currentPlayer?.player?.name || "Unknown"}`);
        };

        const handleAuctionUpdate = (data) => {
            setAuctionData(data.auction);
            if (data.auction.status === "completed") {
                showNotification("Auction completed!");
            }
        };

        const handleTimerSync = (data) => {
            setAuctionData((prev) => ({
                ...prev,
                timeRemaining: data.timeRemaining,
            }));
            setPollTimer(data.timeRemaining);
        };

        const handlePollTimer = (data) => {
            setPollTimer(data.timeRemaining);
            setPollStartTime(data.startTime);
            if (data.timeRemaining <= 0) setPollData(false);
            else setPollData(true);
        };

        const handleError = (error) => {
            setErrorMessage(error.message);
            setTimeout(() => setErrorMessage(""), 5000);
            playBidSound(bidError);
        };

        const handleViewerCount = (data) => {
            setViewerCount(data.count);
        };

        const handleUserPoll = (data) => {
            setUnsoldPlayers(data.unsoldPlayers);
        };

        // Set up event listeners
        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("reconnect", handleReconnect);
        socket.on("initialData", handleInitialData);
        socket.on("bidUpdate", handleBidUpdate);
        socket.on("playerUpdate", handlePlayerUpdate);
        socket.on("auctionUpdate", handleAuctionUpdate);
        socket.on("connect_error", (error) => console.error("WebSocket connection error:", error));
        socket.on("timerSync", handleTimerSync);
        socket.on("error", handleError);
        socket.on("viewerCount", handleViewerCount);
        socket.on("auctionStatusUpdate", handleAuctionStatusUpdate);
        socket.on("userPoll", handleUserPoll);
        socket.on("pollTimerUpdate", handlePollTimer);

        // Remove event listeners on cleanup
        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("reconnect", handleReconnect);
            socket.off("initialData", handleInitialData);
            socket.off("bidUpdate", handleBidUpdate);
            socket.off("playerUpdate", handlePlayerUpdate);
            socket.off("auctionUpdate", handleAuctionUpdate);
            socket.off("connect_error");
            socket.off("timerSync", handleTimerSync);
            socket.off("error", handleError);
            socket.off("viewerCount", handleViewerCount);
            socket.off("userPoll", handleUserPoll);
            socket.off("auctionStatusUpdate", handleAuctionStatusUpdate);
            socket.off("pollTimerUpdate", handlePollTimer);
        };
    }, [socket, id, playBidSound, showNotification, auctionData?.settings?.minBidIncrement]);

    // Update custom bid when minimum bid changes
    useEffect(() => {
        if (minimumBid > 0) {
            setCustomBid(minimumBid);
        }
    }, [minimumBid]);

    const [placeBid, { isLoading: isBidding }] = usePlacebidMutation();

    const handleBid = async (increment) => {
        // Determine the bid amount based on mode
        const newBidAmount = customBidMode
            ? increment // For custom mode, use the input value directly
            : auctionData.currentBid?.amount !== undefined
            ? auctionData.currentBid.amount + increment
            : currentPlayer?.player?.basePrice || 0;

        // Validate bid amount
        if (newBidAmount <= (auctionData?.currentBid?.amount || 0)) {
            setErrorMessage("Bid amount must be higher than the current bid.");
            playBidSound(bidError);
            return;
        }

        try {
            const response = await placeBid({
                playerId: currentPlayer?.player?._id,
                teamId: user._id,
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
            console.error("Failed to place bid:", error);
            setErrorMessage(error.message || "An error occurred");
            setTimeout(() => setErrorMessage(""), 5000);
            playBidSound(bidError);
        }
    };

    const handleSubmitPoll = async () => {
        try {
            socket.emit("submitPollVote", { auctionId: id, playerIds: selectedPlayers, userId: user._id });
        } catch (error) {
            toast.error("Failed to submit. Try again!");
        }
    };
    const handleStop = async () => {
        try {
            const res = await stopAuction({ auctioneerId: user._id, auctionId: id });
            if (res.data?.success) {
                // Immediately update local state
                setAuctionData((prev) => ({
                    ...prev,
                    status: "paused",
                }));

                // Notify all connected clients via socket
                socket.emit("auctionStatusUpdate", {
                    auctionId: id,
                    status: "paused",
                    timeRemaining: auctionData.timeRemaining,
                });

                toast.success("Auction paused successfully");
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
                console.error("Failed to make poll:", response.error);
            }
        });
    };

    // Update handleStart function
    const handleStart = async () => {
        try {
            const res = await startAuction({ auctioneerId: user._id, auctionId: id });
            if (res.data?.success) {
                setAuctionData((prev) => ({
                    ...prev,
                    ...res.data?.data,
                }));

                // Notify all connected clients via socket
                socket.emit("auctionStatusUpdate", {
                    auctionId: id,
                    status: "active",
                    timeRemaining: auctionData.timeRemaining || auctionData.settings.bidTimeLimit,
                });

                socket.emit("resumeAuction", { auctionId: id });

                // Explicitly request timer sync
                socket.emit("requestTimerSync", { auctionId: id });

                toast.success("Auction resumed successfully");
            } else {
                toast.error(res.error?.data?.message || "Failed to resume auction");
            }
        } catch (error) {
            toast.error(error.data?.message || "An error occurred");
        }
    };
    // Update the handleMovetoNextPlayer and handleMarkPlayerAsSold functions:

    const handleMovetoNextPlayer = async () => {
        try {
            socket.emit("requestNextPlayer", { auctionId: id });
            toast.success("Moving to next player");
        } catch (error) {
            toast.error(error.message || "Failed to move to next player");
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

            toast.success(`${currentPlayer.player.name} marked as sold`);
        } catch (error) {
            toast.error(error.message || "Failed to mark player as sold");
        }
    };
    // Error and loading states
    if (err) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-100">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center p-6 max-w-md">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-500">Error</h2>
                    <p className="text-gray-700 mt-2">{err}</p>
                    <Button className="mt-4" onClick={() => window.location.reload()}>
                        Retry
                    </Button>
                </motion.div>
            </div>
        );
    }

    if (loading) {
        return <LoadSpinner />;
    }

    if (
        // user.role === "user" &&
        !auctionData ||
        (auctionData?.status !== "active" && auctionData?.status !== "waiting")
    ) {
        return (
            <AuctionNotStarted
                startTime={auctionData?.startTime}
                endTime={auctionData?.endTime}
                status={auctionData?.status}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
            <div className="container mx-auto p-4 sm:p-6 space-y-6">
                {/* Top Control Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="md:col-span-2 bg-white/90 backdrop-blur-sm shadow-lg">
                        <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant={notifications ? "default" : "outline"}
                                    onClick={() => {
                                        if (!notifications && Notification.permission !== "granted") {
                                            Notification.requestPermission();
                                        }
                                        setNotifications(!notifications);
                                    }}
                                    className="rounded-full transition-all duration-300"
                                    aria-label={notifications ? "Disable notifications" : "Enable notifications"}
                                >
                                    <Bell className={`w-5 h-5 ${notifications ? "text-white" : "text-gray-500"}`} />
                                </Button>
                                <Button
                                    variant={sound ? "default" : "outline"}
                                    onClick={() => setSound(!sound)}
                                    className="rounded-full transition-all duration-300"
                                    aria-label={sound ? "Mute sounds" : "Enable sounds"}
                                >
                                    {sound ? <Volume2 className="text-white" /> : <VolumeX className="text-gray-500" />}
                                </Button>
                            </div>
                            <div className="font-medium">
                                Current Purse:{" "}
                                {formatCurrency(
                                    auctionData?.teams?.find((t) => t._id === "679bb0734960a1491ee6058a")?.purse || 0
                                )}
                            </div>
                            <div className="flex items-center gap-2 bg-gray-100 px-6 py-3 rounded-full">
                                <Users className="w-5 h-5 text-navy-600" />
                                <span className="font-semibold text-gray-700">{viewerCount.toLocaleString()} Live</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-slate-200 shadow-lg">
                        <CardContent className="p-4">
                            <CountdownTimer
                                key={currentPlayer?.player?._id}
                                time={pollTimer || 0}
                                onTimeout={() => {}}
                            />
                        </CardContent>
                    </Card>
                </div>

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
                                <AlertTitle className="flex items-center gap-2 text-green-700">
                                    <CheckCircleIcon className="w-5 h-5" />
                                    Success
                                </AlertTitle>
                                <AlertDescription className="text-green-600">{successMessage}</AlertDescription>
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
                                <AlertTitle className="flex items-center gap-2 text-red-700">
                                    <AlertTriangle className="w-5 h-5" />
                                    Error
                                </AlertTitle>
                                <AlertDescription className="text-red-600">{errorMessage}</AlertDescription>
                            </Alert>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Player Card */}
                    <div className="lg:col-span-2 space-y-6">
                        {currentPlayer?.player ? (
                            <Card className="overflow-hidden shadow-xl bg-white">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row gap-6">
                                        {/* Player Image */}
                                        <div className="w-full md:w-72 relative group">
                                            <div className="rounded-2xl overflow-hidden shadow-lg">
                                                <img
                                                    src={currentPlayer?.player?.image}
                                                    alt={currentPlayer?.player?.name}
                                                    className="w-full object-cover transition-transform duration-300"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = "/placeholder-player.jpg"; // Fallback image
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                            </div>
                                        </div>

                                        {/* Player Info */}
                                        <div className="flex-1 space-y-6">
                                            <div className="space-y-1 mb-4">
                                                <h2 className="text-2xl font-bold text-gray-800">
                                                    {currentPlayer?.player?.name || "Unknown Player"}
                                                </h2>
                                                <p className="text-gray-500">
                                                    {currentPlayer?.player?.role || "Player"}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <motion.div
                                                    whileHover={{ scale: 1.02 }}
                                                    className="bg-gradient-to-br from-navy-700 to-navy-900 p-4 rounded-xl text-white"
                                                >
                                                    <p className="text-xs font-medium opacity-80">Base Price</p>
                                                    <p className="text-xl font-bold">
                                                        {formatCurrency(currentPlayer?.player?.basePrice)}
                                                    </p>
                                                </motion.div>
                                                <motion.div
                                                    whileHover={{ scale: 1.02 }}
                                                    className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl text-white"
                                                >
                                                    <p className="text-xs font-medium opacity-80">Current Bid</p>
                                                    <p className="text-xl font-bold">
                                                        {auctionData.currentBid?.amount
                                                            ? formatCurrency(auctionData.currentBid.amount)
                                                            : formatCurrency(currentPlayer?.player?.basePrice || 0)}
                                                    </p>
                                                </motion.div>
                                            </div>

                                            <PlayerStatsSection player={currentPlayer.player} />
                                        </div>
                                    </div>

                                    {/* Bidding Controls */}
                                    {user.role === "auctioneer" && (
                                        <AuctioneerButtons
                                            handleStop={handleStop}
                                            handleStart={handleStart}
                                            handleMovetoNextPlayer={handleMovetoNextPlayer}
                                            handleMarkPlayerAsSold={handleMarkPlayerAsSold}
                                            status={auctionData.status}
                                        />
                                    )}

                                    {user.role === "user" && (
                                        <div className="mt-6 bg-gray-50 rounded-xl p-6">
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-navy-700 to-navy-900">
                                                    Place Your Bid
                                                </h3>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setCustomBidMode(!customBidMode)}
                                                    className="rounded-full"
                                                >
                                                    {customBidMode ? "Quick Bid" : "Custom Bid"}
                                                </Button>
                                            </div>

                                            {!customBidMode ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    {[1, 2, 5].map((multiplier) => {
                                                        const bidAmount =
                                                            auctionData.currentBid == null
                                                                ? (currentPlayer.player.basePrice || 0) +
                                                                  auctionData.settings.minBidIncrement * multiplier
                                                                : auctionData.currentBid.amount +
                                                                  auctionData?.settings?.minBidIncrement * multiplier;

                                                        return (
                                                            <BidButton
                                                                key={multiplier}
                                                                multiplier={multiplier}
                                                                bidAmount={formatCurrency(bidAmount)}
                                                                onBid={() =>
                                                                    handleBid(
                                                                        auctionData?.settings?.minBidIncrement *
                                                                            multiplier
                                                                    )
                                                                }
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            className="w-full p-4 text-lg font-medium border-2 border-slate-200 rounded-xl
                                                    focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300"
                                                            value={customBid}
                                                            onChange={(e) => setCustomBid(Number(e.target.value))}
                                                            min={minimumBid}
                                                            step={auctionData.settings.minBidIncrement}
                                                            aria-label="Custom bid amount"
                                                        />
                                                        <div className="flex items-center gap-2 ps-1 pt-1">
                                                            <p className="text-sm text-slate-700">min bid:</p>
                                                            <span
                                                                className="font-semibold text-blue-500 cursor-pointer hover:underline"
                                                                onClick={() => setCustomBid(minimumBid)}
                                                            >
                                                                {formatCurrency(minimumBid)}
                                                            </span>
                                                        </div>
                                                        <Wallet className="absolute right-4 top-4 w-6 h-6 text-blue-400" />
                                                    </div>
                                                    <Button
                                                        className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-navy-700 to-navy-900
                                                hover:from-navy-700 hover:to-navy-900 rounded-xl shadow-lg transition-all duration-300"
                                                        onClick={() => handleBid(customBid)}
                                                        disabled={isBidding}
                                                    >
                                                        {isBidding ? "Processing..." : "Place Bid"}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="p-6 flex justify-center items-center h-64">
                                {user.role === "user" && (
                                    <div className="flex flex-col gap-4 items-center">
                                        <p className="text-gray-500">No player is currently available for bidding.</p>
                                        <div className="flex gap-2">
                                            <Button
                                                className="w-full h-10 text-lg font-semibold bg-gradient-to-r from-navy-700 to-navy-900
                hover:from-navy-700 hover:to-navy-900 rounded-xl shadow-lg transition-all duration-300"
                                            >
                                                View Players
                                            </Button>
                                            {pollData && (
                                                <motion.div
                                                    className="w-full flex justify-center"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <AlertDialog>
                                                        <AlertDialogTrigger className="w-full h-10 px-6 text-lg font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl shadow-md transition-all duration-300 flex text-nowrap items-center justify-center">
                                                            Vote Player
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-xl">
                                                            <AlertDialogHeader className="text-center">
                                                                <AlertDialogTitle className="text-xl font-bold text-gray-800">
                                                                    Vote for Unsold Players
                                                                </AlertDialogTitle>
                                                                <AlertDialogDescription className="text-gray-600">
                                                                    Select the players you want to vote for.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>

                                                            <div className="max-h-96 overflow-y-auto">
                                                                <Table className="border">
                                                                    <TableHeader>
                                                                        <TableRow>
                                                                            <TableHead className="text-center">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    className="w-5 h-5 rounded border-gray-300 text-navy-600 focus:ring-blue-500"
                                                                                    checked={
                                                                                        selectedPlayers.length ===
                                                                                        unsoldPlayers.length
                                                                                    }
                                                                                    onChange={(e) => {
                                                                                        handleSelectAll(
                                                                                            e.target.checked
                                                                                        );
                                                                                    }}
                                                                                />
                                                                            </TableHead>
                                                                            <TableHead className="text-left">
                                                                                Player
                                                                            </TableHead>
                                                                            <TableHead className="text-center">
                                                                                Base Price
                                                                            </TableHead>
                                                                            <TableHead className="text-center">
                                                                                Role
                                                                            </TableHead>
                                                                            <TableHead className="text-left">
                                                                                Uncapped
                                                                            </TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {unsoldPlayers.map((player) => (
                                                                            <TableRow
                                                                                key={player._id}
                                                                                className="hover:bg-gray-50 transition-colors"
                                                                            >
                                                                                <TableCell className="text-center">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        className="w-5 h-5 rounded border-gray-300 text-navy-600 focus:ring-blue-500"
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
                                                                                    <img
                                                                                        src={player?.player?.image}
                                                                                        alt={player?.player?.name}
                                                                                        className="w-10 h-10 rounded-full object-cover"
                                                                                    />
                                                                                    <span className="text-sm font-medium text-gray-800">
                                                                                        {player?.player?.name}
                                                                                    </span>
                                                                                </TableCell>
                                                                                <TableCell className="text-sm text-center text-gray-700">
                                                                                    {formatCurrency(
                                                                                        player?.player?.basePrice
                                                                                    )}
                                                                                </TableCell>
                                                                                <TableCell className="text-sm text-center text-gray-700">
                                                                                    {player?.player?.role}
                                                                                </TableCell>
                                                                                <TableCell className="text-sm text-gray-700 text-left capitalize">
                                                                                    {player?.player?.isUncapped
                                                                                        ? "Yes"
                                                                                        : "No"}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>

                                                            {/* Footer with buttons */}
                                                            <AlertDialogFooter className="flex justify-end gap-4 mt-4">
                                                                <AlertDialogCancel className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all">
                                                                    Cancel
                                                                </AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="px-4 py-2 text-sm font-semibold text-white bg-navy-700 rounded-lg hover:bg-navy-800 transition-all"
                                                                    onClick={() => {
                                                                        handleSubmitPoll();
                                                                    }}
                                                                >
                                                                    Save
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </motion.div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {user.role === "auctioneer" && (
                                    <div className="flex flex-col gap-4 items-center">
                                        <p className="text-gray-500">All set of players are completed.</p>
                                        <div className="flex gap-2">
                                            <MakePollButton
                                                handleMakePoll={handleMakePoll}
                                                cooldownDuration={pollTimer}
                                            />
                                            <Button
                                                className="h-10 text-lg font-semibold bg-gradient-to-r from-rose-600 to-rose-700
                                            hover:from-rose-700 hover:to-rose-800 rounded-xl shadow-lg transition-all duration-300"
                                            >
                                                Complete Auction
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        )}

                        {/* Player Status Tabs */}
                        <Tabs defaultValue="sold" className="w-full">
                            <TabsList className="h-10 grid grid-cols-3 gap-2 bg-gray-200 rounded-xl shadow-sm">
                                <TabsTrigger
                                    value="sold"
                                    className="rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300
                                    data-[state=active]:bg-green-50 data-[state=active]:text-green-700
                                    hover:bg-gray-50"
                                >
                                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                                    Sold
                                </TabsTrigger>

                                <TabsTrigger
                                    value="unsold"
                                    className="rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300
                                    data-[state=active]:bg-red-50 data-[state=active]:text-red-700
                                    hover:bg-gray-50"
                                >
                                    <XCircle className="w-4 h-4 mr-2 text-red-500" />
                                    Unsold
                                </TabsTrigger>

                                <TabsTrigger
                                    value="upcoming"
                                    className="rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300
                                    data-[state=active]:bg-slate-50 data-[state=active]:text-navy-800
                                    hover:bg-gray-50"
                                >
                                    <Clock className="w-4 h-4 mr-2 text-blue-500" />
                                    Upcoming
                                </TabsTrigger>
                            </TabsList>
                            <TrackPlayersByStatus auctionData={auctionData} />
                        </Tabs>
                    </div>

                    {/* Recent Bids Panel */}
                    <div className="space-y-6">
                        <Card className="shadow-xl bg-white h-[calc(100vh-120px)] overflow-hidden flex flex-col">
                            <CardHeader className="border-b sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                                <CardTitle className="flex items-center text-lg">
                                    <Trophy className="mr-2 w-5 h-5 text-yellow-500" />
                                    Live Bidding
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4 overflow-y-auto flex-grow">
                                {recBids.length > 0 ? (
                                    <AnimatePresence>
                                        {recBids.map((bid, index) => (
                                            <BidHistoryItem
                                                key={bid._id || index}
                                                bid={bid}
                                                index={index}
                                                formatCurrency={formatCurrency}
                                            />
                                        ))}
                                    </AnimatePresence>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-center">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                            <Wallet className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="font-medium text-gray-700">No bids yet</p>
                                        <p className="text-sm text-gray-500">Be the first to place a bid!</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveAuctionPage;
