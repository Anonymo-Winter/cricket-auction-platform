import { useState } from "react";
import { Input } from "./ui/input";
import { motion } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useNavigate } from "react-router-dom";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { useCreatePlayerMutation } from "../api/playerApi";
import { toast } from "sonner";

const AdminCreatePlayer = () => {
    const navigate = useNavigate();
    const [errMsg, setErrMsg] = useState(null);

    const [createPlayer, { isLoading }] = useCreatePlayerMutation();

    const [playerData, setPlayerData] = useState({
        name: "",
        dateOfBirth: "",
        nationality: "",
        image: "",
        role: "",
        battingStyle: "",
        bowlingStyle: "none",
        iplDebut: new Date().getFullYear(),
        matches: 0,
        basePrice: 2000000,
        isUncapped: true,
        internationalCaps: {
            tests: 0,
            odis: 0,
            t20is: 0,
        },
        availability: "full-season",
        battingStats: {
            innings: 0,
            runs: 0,
            strike_rate: 0,
            average: 0,
            highest_score: 0,
            fifties: 0,
            centuries: 0,
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
        },
    });

    const handleInputChange = (field, value) => {
        setPlayerData((prev) => {
            const newData = { ...prev };
            if (field.includes(".")) {
                const [parent, child] = field.split(".");
                newData[parent] = { ...newData[parent], [child]: value };
            } else {
                newData[field] = value;
            }
            return newData;
        });
    };

    const handleSubmit = async () => {
        setErrMsg("");
        try {
            const res = await createPlayer(playerData);

            if (res.data?.success === true) {
                navigate("/dashboard/players");
            } else {
                setErrMsg(res.error.data.message);
                setTimeout(() => setErrMsg(null), 7000);
                toast.error("Failed to create player");
            }
        } catch (error) {
            console.error("Error occured while creating player : ", error);
            setErrMsg(error?.data?.message || "An unexpected error occurred");
            setTimeout(() => setErrMsg(null), 7000);
        }
    };

    const formFields = [
        {
            label: "Basic Information",
            fields: [
                {
                    label: "Name",
                    content: (
                        <Input
                            type="text"
                            value={playerData.name}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            placeholder="Player Name"
                            className="w-full border border-slate-300"
                        />
                    ),
                },
                {
                    label: "Date of Birth",
                    content: (
                        <Input
                            type="date"
                            value={playerData.dateOfBirth}
                            onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                            className="w-full border border-slate-300"
                            max={new Date().toISOString().split("T")[0]}
                        />
                    ),
                },
                {
                    label: "Nationality",
                    content: (
                        <Input
                            type="text"
                            value={playerData.nationality}
                            onChange={(e) => handleInputChange("nationality", e.target.value)}
                            placeholder="Player Nationality"
                            className="w-full border border-slate-300"
                        />
                    ),
                },
                {
                    label: "Image URL",
                    content: (
                        <Input
                            type="text"
                            value={playerData.image}
                            onChange={(e) => handleInputChange("image", e.target.value)}
                            placeholder="Player Image URL"
                            className="w-full border border-slate-300"
                        />
                    ),
                },
            ],
        },
        {
            label: "Player Role & Style",
            fields: [
                {
                    label: "Role",
                    content: (
                        <Select value={playerData.role} onValueChange={(value) => handleInputChange("role", value)}>
                            <SelectTrigger className="w-full border border-slate-300">
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="batsman">Batsman</SelectItem>
                                <SelectItem value="bowler">Bowler</SelectItem>
                                <SelectItem value="all-rounder">All-Rounder</SelectItem>
                                <SelectItem value="wicket-keeper">Wicket Keeper</SelectItem>
                                <SelectItem value="wicket-keeper-batsman">Wicket Keeper Batsman</SelectItem>
                            </SelectContent>
                        </Select>
                    ),
                },
                {
                    label: "Batting Style",
                    content: (
                        <Select
                            value={playerData.battingStyle}
                            onValueChange={(value) => handleInputChange("battingStyle", value)}
                        >
                            <SelectTrigger className="w-full border border-slate-300">
                                <SelectValue placeholder="Select batting style" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="right-handed">Right Handed</SelectItem>
                                <SelectItem value="left-handed">Left Handed</SelectItem>
                            </SelectContent>
                        </Select>
                    ),
                },
                {
                    label: "Bowling Style",
                    content: (
                        <Select
                            value={playerData.bowlingStyle}
                            onValueChange={(value) => handleInputChange("bowlingStyle", value)}
                        >
                            <SelectTrigger className="w-full border border-slate-300">
                                <SelectValue placeholder="Select bowling style" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="right-arm-fast">Right Arm Fast</SelectItem>
                                <SelectItem value="right-arm-medium">Right Arm Medium</SelectItem>
                                <SelectItem value="right-arm-off-spin">Right Arm Off Spin</SelectItem>
                                <SelectItem value="right-arm-leg-spin">Right Arm Leg Spin</SelectItem>
                                <SelectItem value="left-arm-fast">Left Arm Fast</SelectItem>
                                <SelectItem value="left-arm-medium">Left Arm Medium</SelectItem>
                                <SelectItem value="left-arm-spin">Left Arm Spin</SelectItem>
                            </SelectContent>
                        </Select>
                    ),
                },
            ],
        },
        {
            label: "IPL Experience",
            fields: [
                {
                    label: "IPL Debut Year",
                    content: (
                        <Input
                            type="number"
                            value={playerData.iplDebut}
                            onChange={(e) => handleInputChange("iplDebut", parseInt(e.target.value))}
                            min={2008}
                            max={new Date().getFullYear()}
                            className="w-full border border-slate-300"
                        />
                    ),
                },
                {
                    label: "Matches Played",
                    content: (
                        <Input
                            type="number"
                            value={playerData.matches}
                            onChange={(e) => handleInputChange("matches", parseInt(e.target.value))}
                            min={0}
                            className="w-full border border-slate-300"
                        />
                    ),
                },
            ],
        },
        {
            label: "Auction Details",
            fields: [
                {
                    label: "Base Price (₹)",
                    content: (
                        <Input
                            type="number"
                            value={playerData.basePrice}
                            onChange={(e) => handleInputChange("basePrice", parseInt(e.target.value))}
                            min={2000000}
                            step={100000}
                            className="w-full border border-slate-300"
                        />
                    ),
                },
                {
                    label: "Availability",
                    content: (
                        <Select
                            value={playerData.availability}
                            onValueChange={(value) => handleInputChange("availability", value)}
                        >
                            <SelectTrigger className="w-full border border-slate-300">
                                <SelectValue placeholder="Select availability" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="full-season">Full Season</SelectItem>
                                <SelectItem value="partial-season">Partial Season</SelectItem>
                            </SelectContent>
                        </Select>
                    ),
                },
            ],
        },
        {
            label: "International Experience",
            fields: [
                {
                    label: "Uncapped Player",
                    content: (
                        <div className="flex items-center space-x-2">
                            <Switch
                                checked={playerData.isUncapped}
                                onCheckedChange={(checked) => handleInputChange("isUncapped", checked)}
                                className="bg-navy-700"
                            />
                            <Label>Is Uncapped</Label>
                        </div>
                    ),
                },
                {
                    label: "Test Matches",
                    content: (
                        <Input
                            type="number"
                            value={playerData.internationalCaps.tests}
                            onChange={(e) => handleInputChange("internationalCaps.tests", parseInt(e.target.value))}
                            min={0}
                            disabled={playerData.isUncapped}
                            className="w-full border border-slate-300"
                        />
                    ),
                },
                {
                    label: "ODI Matches",
                    content: (
                        <Input
                            type="number"
                            value={playerData.internationalCaps.odis}
                            onChange={(e) => handleInputChange("internationalCaps.odis", parseInt(e.target.value))}
                            min={0}
                            disabled={playerData.isUncapped}
                            className="w-full border border-slate-300"
                        />
                    ),
                },
                {
                    label: "T20I Matches",
                    content: (
                        <Input
                            type="number"
                            value={playerData.internationalCaps.t20is}
                            onChange={(e) => handleInputChange("internationalCaps.t20is", parseInt(e.target.value))}
                            min={0}
                            disabled={playerData.isUncapped}
                            className="w-full border border-slate-300"
                        />
                    ),
                },
            ],
        },
    ];

    return (
        <div className="bg-white p-1 md:p-3">
            <div className="mt-3 border-b border-slate-200 pb-4">
                <h2 className="font-display tracking-tight text-navy-900 text-2xl font-semibold">New player</h2>
                <p className="mt-1 text-sm text-slate-500">Add a player to the pool. They can be added to any auction before it opens.</p>
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

            <div className="w-full max-w-4xl pt-4 space-y-6">
                {formFields.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="space-y-4">
                        <h3 className="font-display text-lg font-semibold tracking-tight text-navy-900">{section.label}</h3>

                        {/* Desktop View */}
                        <div className="hidden sm:block">
                            <Table className="form-rows">
                                <TableBody>
                                    {section.fields.map((field, fieldIndex) => (
                                        <TableRow key={fieldIndex} className="hover:bg-white">
                                            <TableCell className="font-medium w-1/4">{field.label}</TableCell>
                                            <TableCell className="w-3/4">{field.content}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile View */}
                        <div className="sm:hidden space-y-4">
                            {section.fields.map((field, fieldIndex) => (
                                <div key={fieldIndex} className="space-y-2">
                                    <label className="block font-medium text-sm">{field.label}</label>
                                    <div className="w-full">{field.content}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <div className="flex flex-col sm:flex-row gap-3 mt-6 items-center justify-end">
                    <Button
                        variant="outline"
                        className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-100"
                        onClick={() => navigate("/dashboard/players")}
                    >
                        Cancel
                    </Button>
                    <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? "Creating..." : "Create Player"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AdminCreatePlayer;
