import ErrorState from "./ErrorState";
import ConfirmDialog from "./ConfirmDialog";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedPlayer } from "../store/playerSlice.js";
import { Button } from "./ui/button.tsx";
import { Input } from "./ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs.tsx";
import LoadingSpinner from "./LoadSpinner.jsx";
import { Table, TableBody, TableCell, TableRow } from "./ui/table.tsx";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert.tsx";
import { Activity, AlertTriangle, ArrowLeft, Award, Crown, Star, Trash2, Trophy, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useDeletePlayerMutation, useGetPlayerByIdQuery, useUpdatePlayerMutation } from "../api/playerApi.js";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PlayerHistory = ({ playerData }) => {
    const formatPrice = (price) => {
        return `₹${(price / 10000000).toFixed(2)} Cr`;
    };

    return (
        <div className="space-y-6 p-4 bg-white">
            {/* Career Overview */}
            <Card className="border border-slate-300 shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-600 ">
                        <Award className="h-5 w-5 " />
                        Career Overview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-lg border p-4 shadow-md border-gray-300">
                            <p className="text-sm text-gray-600">IPL Experience</p>
                            <p className="text-xl font-semibold">
                                {new Date().getFullYear() - playerData?.iplDebut} Years
                            </p>
                            <p className="text-sm text-gray-500">Debut: {playerData?.iplDebut}</p>
                        </div>
                        <div className="rounded-lg border p-4 shadow-md border-gray-300">
                            <p className="text-sm text-gray-600">Total Matches</p>
                            <p className="text-xl font-semibold">{playerData?.matches}</p>
                        </div>
                        <div className="rounded-lg border p-4 shadow-md border-gray-300">
                            <p className="text-sm text-gray-600">Player Status</p>
                            <Badge
                                className="mt-1 bg-rose-600"
                                variant={playerData?.isUncapped ? "secondary" : "default"}
                            >
                                <Crown className="h-3 w-3 me-1" />
                                {playerData?.isUncapped ? "Uncapped" : "Capped"}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Team History */}
            <Card className="border border-slate-300 shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-navy-600">
                        <Users className="h-5 w-5 " />
                        IPL Team History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {playerData.previousTeams?.length > 0 ? (
                        <div className="space-y-4">
                            {playerData?.previousTeams?.map((history, index) => {
                                if (history.team) {
                                    return (
                                        <div
                                            key={index}
                                            className="flex items-center gap-4 border-l-2 border-blue-400 pl-4"
                                        >
                                            <div className="flex-shrink-0">
                                                <Badge variant="outline" className="bg-blue-200 text-navy-800">
                                                    {history.season}
                                                </Badge>
                                            </div>
                                            <div>
                                                <p className="font-medium">{history.team?.name || "Unknown Team"}</p>
                                                <p className="text-sm text-gray-500">
                                                    Auction Price: {formatPrice(playerData.previousTeams[index].price)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    ) : (
                        <div className="text-gray-500">No Teams</div>
                    )}
                </CardContent>
            </Card>

            {(playerData?.role === "batsman" ||
                playerData?.role === "all-rounder" ||
                playerData?.role === "wicket-keeper-batsman") && (
                <Card className="border border-slate-300 shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Batting Career Stats
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-lg border p-4 shadow-md border-gray-300">
                                <p className="text-sm text-gray-500">Batting Style</p>
                                <p className="font-semibold">{playerData?.battingStyle}</p>
                            </div>
                            <div className="rounded-lg border p-4 shadow-md border-gray-300">
                                <p className="text-sm text-gray-500">Total Runs</p>
                                <p className="font-semibold">{playerData?.battingStats?.runs}</p>
                            </div>
                            <div className="rounded-lg border p-4 shadow-md border-gray-300">
                                <p className="text-sm text-gray-500">Average</p>
                                <p className="font-semibold">{playerData?.battingStats?.average?.toFixed(2)}</p>
                            </div>
                            <div className="rounded-lg border p-4 shadow-md border-gray-300">
                                <p className="text-sm text-gray-500">Strike Rate</p>
                                <p className="font-semibold">{playerData?.battingStats?.strike_rate?.toFixed(2)}</p>
                            </div>
                            <div className="rounded-lg border p-4 shadow-md border-gray-300">
                                <p className="text-sm text-gray-500">Highest Score</p>
                                <p className="font-semibold">{playerData?.battingStats?.highest_score}</p>
                            </div>
                            <div className="rounded-lg border p-4 shadow-md border-gray-300">
                                <p className="text-sm text-gray-500">50s/100s</p>
                                <p className="font-semibold">
                                    {playerData?.battingStats?.fifties}/{playerData?.battingStats?.centuries}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Bowling Statistics */}
            {(playerData?.role === "bowler" || playerData?.role === "all-rounder") && (
                <Card className="border border-slate-300 shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-600">
                            <Activity className="h-5 w-5" />
                            Bowling Career Stats
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-lg border p-4 shadow-md border-gray-300">
                                <p className="text-sm text-gray-600">Bowling Style</p>
                                <p className="font-semibold">{playerData?.bowlingStyle}</p>
                            </div>
                            <div className="rounded-lg border p-4 shadow-md border-gray-300">
                                <p className="text-sm text-gray-600">Wickets</p>
                                <p className="font-semibold">{playerData?.bowlingStats?.wickets}</p>
                            </div>
                            <div className="rounded-lg border p-4 shadow-md border-gray-300">
                                <p className="text-sm text-gray-600">Economy</p>
                                <p className="font-semibold">{playerData?.bowlingStats?.economy?.toFixed(2)}</p>
                            </div>
                            <div className="rounded-lg border p-4 shadow-md border-gray-300">
                                <p className="text-sm text-gray-600">Best Figures</p>
                                <p className="font-semibold">
                                    {playerData?.bowlingStats?.best_figures?.wickets}/
                                    {playerData?.bowlingStats?.best_figures?.runs}
                                </p>
                            </div>
                            <div className="rounded-lg border p-4 shadow-md border-gray-300">
                                <p className="text-sm text-gray-600">5 Wicket Hauls</p>
                                <p className="font-semibold">{playerData?.bowlingStats?.five_wickets}</p>
                            </div>
                            <div className="rounded-lg border p-4 shadow-md border-gray-300">
                                <p className="text-sm text-gray-600">Average</p>
                                <p className="font-semibold">{playerData?.bowlingStats?.average?.toFixed(2)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* International Experience */}
            <Card className="border border-slate-300 shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-navy-700">
                        <Star className="h-5 w-5" />
                        International Experience
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-lg border p-4 shadow-md border-gray-300">
                            <p className="text-sm text-gray-600">Test Matches</p>
                            <p className="font-semibold">{playerData?.internationalCaps?.tests}</p>
                        </div>
                        <div className="rounded-lg border p-4 shadow-md border-gray-300">
                            <p className="text-sm text-gray-600">ODIs</p>
                            <p className="font-semibold">{playerData?.internationalCaps?.odis}</p>
                        </div>
                        <div className="rounded-lg border p-4 shadow-md border-gray-300">
                            <p className="text-sm text-gray-600">T20Is</p>
                            <p className="font-semibold">{playerData?.internationalCaps?.t20is}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Rankings & Specializations */}
            <Card className="border border-slate-300 shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-rose-500">
                        <Trophy className="h-5 w-5" />
                        Rankings & Specializations
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-lg border p-4 shadow-md border-gray-300">
                            <p className="text-sm text-gray-500">T20 Ranking</p>
                            <p className="font-semibold">{playerData?.rankings?.t20 || "N/A"}</p>
                        </div>
                        <div className="rounded-lg border p-4 shadow-md border-gray-300">
                            <p className="text-sm text-gray-500">IPL Ranking</p>
                            <p className="font-semibold">{playerData?.rankings?.ipl || "N/A"}</p>
                        </div>
                    </div>
                    {playerData?.specializations?.length > 0 && (
                        <div className="mt-4">
                            <p className="text-sm text-gray-500 mb-2">Specializations</p>
                            <div className="flex flex-wrap gap-2">
                                {playerData.specializations.map((spec, index) => (
                                    <Badge key={index} variant="secondary" className="bg-rose-50">
                                        {spec}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const PlayerForm = ({ playerData, basePrice }) => {
    const dispatch = useDispatch();
    const selectedPlayer = useSelector((state) => state.players.selectedPlayer);
    const [updatePlayer, { isLoading }] = useUpdatePlayerMutation();
    const [deletePlayer] = useDeletePlayerMutation();
    const [errMsg, setErrMsg] = useState(null);

    const { id } = useParams();

    const [editFormData, setEditFormData] = useState({
        name: "",
        dateOfBirth: "",
        nationality: "",
        role: "",
        battingStyle: "",
        bowlingStyle: "",
        iplDebut: "",
        matches: 0,
        basePrice: 0,
        currentPrice: 0,
        status: "",
        isUncapped: false,
        availability: "",
        image: "",
        battingStats: {
            innings: 0,
            runs: 0,
            average: 0,
            strike_rate: 0,
            highest_score: 0,
            fifties: 0,
            centuries: 0,
            fours: 0,
            sixes: 0,
            notOuts: 0,
        },
        bowlingStats: {
            innings: 0,
            overs: 0,
            wickets: 0,
            economy: 0,
            average: 0,
            best_figures: {
                wickets: 0,
                runs: 0,
            },
            five_wickets: 0,
            dot_balls: 0,
            runs_conceded: 0,
        },
        internationalCaps: {
            tests: 0,
            odis: 0,
            t20is: 0,
        },
    });

    useEffect(() => {
        if (playerData) {
            dispatch(setSelectedPlayer(playerData));
            setEditFormData({
                ...playerData,
                dateOfBirth: new Date(playerData?.dateOfBirth)?.toISOString()?.split("T")[0],
            });
        }
    }, [playerData, dispatch]);

    const handleCancel = () => {
        if (selectedPlayer) {
            setEditFormData({
                ...selectedPlayer,
                dateOfBirth: new Date(selectedPlayer?.dateOfBirth)?.toISOString().split("T")[0],
            });
        }
    };

    const handleSave = async () => {
        try {
            const res = await updatePlayer({ id, updatedData: editFormData }).unwrap();
            setEditFormData({
                ...selectedPlayer,
                ...editFormData,
                dateOfBirth: new Date(editFormData.dateOfBirth)?.toISOString()?.split("T")[0],
            });
            dispatch(setSelectedPlayer(res.data));
            toast.success("Player details updated successfully!");
        } catch (err) {
            toast.error("Failed to update player details!");
        }
    };

    const handleInputChange = (field, value, category = null) => {
        if (category) {
            setEditFormData((prev) => ({
                ...prev,
                [category]: {
                    ...prev[category],
                    [field]: value,
                },
            }));
        } else {
            setEditFormData((prev) => ({
                ...prev,
                [field]: value,
            }));
        }
    };

    const roleOptions = ["batsman", "bowler", "all-rounder", "wicket-keeper", "wicket-keeper-batsman"];
    const battingStyleOptions = ["right-handed", "left-handed"];
    const bowlingStyleOptions = [
        "right-arm-fast",
        "right-arm-medium",
        "right-arm-off-spin",
        "right-arm-leg-spin",
        "left-arm-fast",
        "left-arm-medium",
        "left-arm-spin",
        "none",
    ];
    const statusOptions = ["unsold", "sold", "available"];
    const availabilityOptions = ["full-season", "partial-season"];

    const formSections = [
        {
            title: "Basic Information",
            fields: [
                { label: "Name", field: "name", type: "text" },
                { label: "Date of Birth", field: "dateOfBirth", type: "date" },
                { label: "Nationality", field: "nationality", type: "text" },
                { label: "Image URL", field: "image", type: "text" },
                {
                    label: "Role",
                    field: "role",
                    type: "select",
                    options: roleOptions,
                },
                {
                    label: "Batting Style",
                    field: "battingStyle",
                    type: "select",
                    options: battingStyleOptions,
                },
                {
                    label: "Bowling Style",
                    field: "bowlingStyle",
                    type: "select",
                    options: bowlingStyleOptions,
                },
            ],
        },
        {
            title: "Career Information",
            fields: [
                { label: "IPL Debut Year", field: "iplDebut", type: "number" },
                { label: "Matches", field: "matches", type: "number" },
                { label: "Base Price", field: "basePrice", type: "number", more: `suggested base price ${basePrice}` },
                {
                    label: "Status",
                    field: "status",
                    type: "select",
                    options: statusOptions,
                },
                {
                    label: "Availability",
                    field: "availability",
                    type: "select",
                    options: availabilityOptions,
                },
                { label: "Uncapped", field: "isUncapped", type: "checkbox" },
            ],
        },
        {
            title: "Batting Statistics",
            category: "battingStats",
            fields: [
                { label: "Innings", field: "innings", type: "number" },
                { label: "Runs", field: "runs", type: "number" },
                { label: "Average", field: "average", type: "number" },
                { label: "Strike Rate", field: "strike_rate", type: "number" },
                { label: "Highest Score", field: "highest_score", type: "number" },
                { label: "Fifties", field: "fifties", type: "number" },
                { label: "Centuries", field: "centuries", type: "number" },
                { label: "Fours", field: "fours", type: "number" },
                { label: "Sixes", field: "sixes", type: "number" },
                { label: "Not Outs", field: "notOuts", type: "number" },
            ],
        },
        {
            title: "Bowling Statistics",
            category: "bowlingStats",
            fields: [
                { label: "Innings", field: "innings", type: "number" },
                { label: "Overs", field: "overs", type: "number" },
                { label: "Wickets", field: "wickets", type: "number" },
                { label: "Economy", field: "economy", type: "number" },
                { label: "Average", field: "average", type: "number" },
                { label: "Five Wickets", field: "five_wickets", type: "number" },
                { label: "Dot Balls", field: "dot_balls", type: "number" },
                { label: "Runs Conceded", field: "runs_conceded", type: "number" },
            ],
        },
        {
            title: "International Caps",
            category: "internationalCaps",
            fields: [
                { label: "Tests", field: "tests", type: "number" },
                { label: "ODIs", field: "odis", type: "number" },
                { label: "T20Is", field: "t20is", type: "number" },
            ],
        },
    ];
    const navigate = useNavigate();

    const renderField = (field, category = null) => {
        const value = category ? editFormData[category][field.field] : editFormData[field.field];

        switch (field.type) {
            case "select":
                return (
                    <Select
                        value={value}
                        onValueChange={(val) => handleInputChange(field.field, val, category)}
                        className="w-full"
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={`Select ${field.label}`} />
                        </SelectTrigger>
                        <SelectContent>
                            {field.options.map((option) => (
                                <SelectItem key={option} value={option}>
                                    {option.charAt(0).toUpperCase() + option.slice(1)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            case "checkbox":
                return (
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => handleInputChange(field.field, e.target.checked, category)}
                            className="w-4 h-4 text-navy-700 border border-slate-300 rounded focus:ring-0 checked:bg-navy-600 checked:border-slate-300"
                        />
                    </div>
                );
            default:
                return (
                    <Input
                        type={field.type}
                        value={value || ""}
                        onChange={(e) => handleInputChange(field.field, e.target.value, category)}
                        min={field.type === "number" ? 0 : undefined}
                        className="w-full border border-slate-300 shadow-sm"
                    />
                );
        }
    };

    const [deleteOpen, setDeleteOpen] = useState(false);
    const handleDelete = async () => {
        {
            try {
                const res = await deletePlayer({ id });
                if (res.data?.success === true) {
                    dispatch(setSelectedPlayer(null));
                    navigate("/dashboard/players");
                    toast.success("Player deleted successfully");
                } else {
                    setErrMsg(res.error.data.message);
                    setTimeout(() => setErrMsg(null), 7000);
                    toast.error("Failed to delete player");
                }
            } catch (error) {
                console.error("Error deleting player:", error);
            }
        }
    };

    return (
        <>
            <div className="bg-white border-b border-slate-300">
                <div className="max-w-7xl mx-auto">
                    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
                            <div className="flex-1 min-w-0">
                                <h2 className="font-display tracking-tight text-xl sm:text-2xl font-bold text-navy-900 truncate">
                                    Edit Player Details
                                </h2>
                                <p className="mt-1 text-sm text-navy-800">Manage player information and statistics</p>
                            </div>
                            <div className="flex-shrink-0">
                                <ConfirmDialog
                                    open={deleteOpen}
                                    onOpenChange={setDeleteOpen}
                                    title="Delete this player?"
                                    description={`${editFormData?.name || "This player"} will be permanently deleted. This can't be undone.`}
                                    confirmLabel="Delete player"
                                    onConfirm={handleDelete}
                                />
                                <Button
                                    variant="outline"
                                    onClick={() => setDeleteOpen(true)}
                                    className="flex items-center border border-red-500 bg-red-50 text-red-500 gap-2 transition-all hover:bg-red-500 hover:text-white active:bg-red-700 shadow-sm hover:shadow-md"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="hidden sm:inline">Delete Player</span>
                                    <span className="sm:hidden">Delete</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {errMsg && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="mt-3"
                >
                    <Alert variant="destructive" className="border-red-500 bg-red-50 flex flex-row gap-1">
                        <AlertTitle className="flex items-center gap-2 text-red-700">
                            <AlertTriangle className="w-5 h-5" />
                            Error:
                        </AlertTitle>
                        <AlertDescription className="text-red-600">{errMsg}</AlertDescription>
                    </Alert>
                </motion.div>
            )}

            <div className="w-full max-w-4xl pt-4">
                {formSections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="mb-8">
                        <h3 className="text-lg font-semibold mb-4">{section.title}</h3>

                        {/* Desktop View */}
                        <div className="hidden md:block">
                            <Table className="form-rows">
                                <TableBody>
                                    {section.fields.map((field, fieldIndex) => (
                                        <TableRow key={fieldIndex} className="hover:bg-light border-none">
                                            <TableCell className="font-medium w-1/4">{field.label}</TableCell>
                                            <TableCell className="w-3/4">
                                                {renderField(field, section.category)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile View */}
                        <div className="md:hidden space-y-4">
                            {section.fields.map((field, fieldIndex) => (
                                <div key={fieldIndex} className="border-b border-gray-100 pb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {field.label}
                                    </label>
                                    <div className="w-full">{renderField(field, section.category)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <div className="flex flex-col sm:flex-row gap-3 mt-8 items-center justify-end sticky bottom-0 bg-white p-4 border-t border-gray-200">
                    <Button
                        className="w-full sm:w-auto bg-slate-800  border border-slate-300 hover:bg-slate-900 shadow-md hover:shadow-lg"
                        onClick={handleCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="w-full sm:w-auto bg-navy-700 border border-slate-300 hover:bg-navy-800 shadow-md hover:shadow-lg"
                        onClick={handleSave}
                        disabled={isLoading}
                    >
                        {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>
        </>
    );
};

const PlayerDetails = () => {
    const dispatch = useDispatch();
    const selectedPlayer = useSelector((state) => state.players.selectedPlayer);
    const { id } = useParams();
    const navigate = useNavigate();

    const {
        data: player,
        isLoading,
        error,
    } = useGetPlayerByIdQuery(id, {
        refetchOnMountOrArgChange: true,
    });

    useEffect(() => {
        if (player) {
            dispatch(setSelectedPlayer(player.data));
        }
    }, [player, dispatch]);

    if (isLoading || (!error && (!player?.data || selectedPlayer?._id !== player.data._id))) return <LoadingSpinner />;

    if (error) {
        return (
            <ErrorState inline error={error} what="player" backLabel="Back to players" onBack={() => { dispatch(setSelectedPlayer(null)); navigate("/dashboard/players"); }} onRetry={() => window.location.reload()} />
        );
    }

    return (
        <div className="container mx-auto bg-white p-2 rounded-md">
            <Button
                variant="ghost"
                onClick={() => {
                    navigate("/dashboard/players");
                    dispatch(setSelectedPlayer(null));
                }}
                className="mb-4 hover:bg-slate-100"
            >
                <ArrowLeft /> Back to Players
            </Button>

            <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full md:w-1/3 grid-cols-2 bg-slate-100 shadow-sm border border-slate-300">
                    <TabsTrigger value="details">Player Details</TabsTrigger>
                    <TabsTrigger value="history">Player History</TabsTrigger>
                </TabsList>

                <TabsContent value="details">
                    <PlayerForm playerData={selectedPlayer} basePrice={player.suggestedBasePrice} />
                </TabsContent>
                <TabsContent value="history">
                    <PlayerHistory playerData={selectedPlayer} />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default PlayerDetails;
