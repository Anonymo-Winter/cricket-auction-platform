import { useState } from "react";
import { Input } from "./ui/input";
import { motion } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert.tsx";
import { AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableRow } from "./ui/table.tsx";
import { Button } from "./ui/button.tsx";
import { useCreateteamMutation } from "../api/teamApi.js";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import getTeamThemeColor from "../lib/colorThemeUtil.js";
import { useGetUsersQuery } from "../api/userApi.js";

const AdminCreateTeam = () => {
    const [createteam, { isLoading }] = useCreateteamMutation();
    const { data: usersData } = useGetUsersQuery();
    const freeOwners = (usersData?.users || []).filter((u) => !u.team);
    const [errMsg, setErrMsg] = useState(null);
    const [editFormData, setEditFormData] = useState({
        name: "",
        shortName: "",
        logo: "",
        purseRemaining: 10000000,
        owner: "",
        color: "default",
    });
    const navigate = useNavigate();

    const handleInputChange = (field, value) => {
        setEditFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
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
    const formFields = [
        {
            label: "Name",
            content: (
                <Input
                    id="name"
                    type="text"
                    value={editFormData.name || ""}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Team Name"
                    className="border border-slate-300"
                />
            ),
        },
        {
            label: "Short Name",
            content: (
                <Input
                    type="text"
                    value={editFormData.shortName || ""}
                    onChange={(e) => handleInputChange("shortName", e.target.value)}
                    placeholder="Team Short Name eg: CSK"
                    className="border border-slate-300"
                />
            ),
        },
        {
            label: "Logo URL",
            content: (
                <Input
                    type="text"
                    value={editFormData.logo || ""}
                    onChange={(e) => handleInputChange("logo", e.target.value)}
                    placeholder="Team Logo URL"
                    className="border border-slate-300"
                />
            ),
        },
        {
            label: "Team owner",
            content: (
                <div>
                    <select
                        value={editFormData.owner || ""}
                        onChange={(e) => handleInputChange("owner", e.target.value)}
                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                    >
                        <option value="">Select an owner without a team</option>
                        {freeOwners.map((u) => (
                            <option key={u._id} value={u._id}>
                                {u.name} ({u.email})
                            </option>
                        ))}
                    </select>
                    {usersData && freeOwners.length === 0 && (
                        <p className="mt-1 text-xs text-gray-500">
                            Every owner already has a team. Invite a new owner from Access Control first.
                        </p>
                    )}
                </div>
            ),
        },
        {
            label: "select a color",
            content: (
                // <div className="flex flex-col items-center justify-center">
                //     <span>Select a theme</span>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-6 gap-3 p-4">
                    {COLORS.map((colori, index) => {
                        return (
                            <motion.div
                                key={index}
                                className={`h-14 w-14 bg-gradient-to-r relative rounded-full cursor-pointer ${getTeamThemeColor(
                                    colori
                                )} ${
                                    editFormData.color === colori
                                        ? "ring-1 ring-offset-2 ring-gray-500 shadow-md shadow-gray-600"
                                        : ""
                                }`}
                                animate={{
                                    background: getTeamThemeColor(colori).gradients,
                                }}
                                transition={{
                                    duration: 8,
                                    repeat: Infinity,
                                    repeatType: "loop",
                                    ease: "linear",
                                }}
                                onClick={() => handleInputChange("color", colori)}
                            ></motion.div>
                        );
                    })}
                </div>
                // </div>
            ),
        },
    ];

    const handleSubmit = async () => {
        setErrMsg("");
        try {
            const res = await createteam(editFormData).unwrap();
            if (res.success) {
                toast.success("Team created successfully!");
                navigate(`/dashboard/teams/${res.team._id}`);
            }
        } catch (error) {
            console.error(error);
            setErrMsg(error?.data?.message || "An unexpected error occurred");
            setTimeout(() => setErrMsg(null), 7000);
            toast.error("Failed to create team!");
        }
    };
    return (
        <div className="bg-white p-3">
            <div className="mt-3 border-b border-slate-200 pb-4">
                <h2 className="font-display tracking-tight text-navy-900 text-2xl font-semibold">New team</h2>
                <p className="mt-1 text-sm text-slate-500">Give the team a name, a logo and an owner. Colours are used for its cards and the big screen.</p>
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
                            Error :
                        </AlertTitle>
                        <AlertDescription className="text-red-600">{errMsg}</AlertDescription>
                    </Alert>
                </motion.div>
            )}
            <div className="w-full max-w-4xl pt-4">
                {/* Desktop View */}
                <div className="hidden sm:block">
                    <Table className="form-rows">
                        <TableBody>
                            {formFields.map((field, index) => (
                                <TableRow key={index} className="hover:bg-light border-none">
                                    <TableCell className="font-medium w-1/4">{field.label}</TableCell>
                                    <TableCell className="w-3/4">{field.content}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile View */}
                <div className="sm:hidden space-y-4">
                    {formFields.map((field, index) => (
                        <div key={index} className=" pb-4">
                            <label className="block font-medium text-sm mb-2">{field.label}</label>
                            <div className="w-full">{field.content}</div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-4 items-center justify-end">
                    <Button
                        variant="outline"
                        className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-100"
                        onClick={() => {
                            navigate("/dashboard/teams");
                        }}
                    >
                        Cancel
                    </Button>
                    <Button className="w-full sm:w-auto" onClick={handleSubmit}>
                        {isLoading ? "Saving..." : "Create"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AdminCreateTeam;
