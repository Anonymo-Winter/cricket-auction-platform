import ErrorState from "./ErrorState";
import { useDispatch, useSelector } from "react-redux";
import { formatMoney } from "../lib/money";
import EmptyState from "./EmptyState";
import ConfirmDialog from "./ConfirmDialog";
import { Users } from "lucide-react";
import { setSelectedTeam } from "../store/teamSlice.js";
import { Button } from "./ui/button.tsx";
import { Input } from "./ui/input.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs.tsx";
import LoadingSpinner from "./LoadSpinner.jsx";
import AdminsTeamPlayerView from "./AdminsTeamPlayerView.jsx";
// import AdminsTeamView from "./AdminsAuctionsTeamView.jsx";
import AddPlayersToTeam from "./AddPlayersToTeam.jsx";
import { Table, TableBody, TableCell, TableRow } from "./ui/table.tsx";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert.tsx";
import { AlertTriangle, ArrowLeft, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useGetTeamsByIdQuery, useUpdateTeamMutation, useDeleteTeamMutation } from "../api/teamApi.js";
// TeamForm Component
const TeamForm = ({ auction }) => {
    const dispatch = useDispatch();
    const selectedTeam = useSelector((state) => state.teams.selectedTeam);
    const [updateTeam, { isLoading }] = useUpdateTeamMutation();
    const [deleteTeam] = useDeleteTeamMutation();
    const navigate = useNavigate();
    const [errMsg, setErrMsg] = useState(null);

    const [editFormData, setEditFormData] = useState({
        name: "",
        shortName: "",
        logo: "",
        purseRemaining: 0,
        maxBidAmount: 0,
        players: [],
        currentSquadSize: 0,
        overseasCount: 0,
        owner: "",
    });

    useEffect(() => {
        if (auction) {
            dispatch(setSelectedTeam(auction));
            setEditFormData({
                name: auction.name || "",
                shortName: auction.shortName || "",
                logo: auction.logo || "",
                purseRemaining: auction.purseRemaining || 0,
                maxBidAmount: auction.maxBidAmount || 0,
                players: auction.players || [],
                currentSquadSize: auction.currentSquadSize || 0,
                overseasCount: auction.overseasCount || 0,
                owner: auction.owner || "",
            });
        }
    }, [auction, dispatch]);

    const { id } = useParams();

    const handleCancel = async () => {
        if (selectedTeam) {
            setEditFormData({
                name: selectedTeam.name || "",
                shortName: selectedTeam.shortName || "",
                logo: selectedTeam.logo || "",
                purseRemaining: selectedTeam.purseRemaining || 0,
                maxBidAmount: selectedTeam.maxBidAmount || 0,
                players: selectedTeam.players || [],
                currentSquadSize: selectedTeam.currentSquadSize || 0,
                overseasCount: selectedTeam.overseasCount || 0,
                owner: selectedTeam.owner || "",
            });
        }
    };

    const handleSave = async () => {
        try {
            await updateTeam({ id, updatedData: editFormData }).unwrap();
            const updatedAuction = {
                ...selectedTeam,
                ...editFormData,
            };
            setEditFormData({ ...editFormData, ...updateTeam });
            dispatch(setSelectedTeam(updatedAuction));
            toast.success("Team details updated successfully!");
        } catch (error) {
            console.error("Can't update the team details : ", error.data.message);
            toast.error("Failed to updated team details!");
        }
    };
    const handleInputChange = (field, value) => {
        setEditFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const formFields = [
        {
            label: "Name",
            content: (
                <Input
                    id="name"
                    type="text"
                    value={editFormData.name || ""}
                    className="border border-slate-300 shadow-sm"
                    onChange={(e) => handleInputChange("name", e.target.value)}
                />
            ),
        },
        {
            label: "Short Name",
            content: (
                <Input
                    type="text"
                    value={editFormData.shortName || ""}
                    className="border border-slate-300 shadow-sm"
                    onChange={(e) => handleInputChange("shortName", e.target.value)}
                />
            ),
        },
        {
            label: "Logo URL",
            content: (
                <Input
                    type="text"
                    value={editFormData.logo || ""}
                    className="border border-slate-300 shadow-sm"
                    onChange={(e) => handleInputChange("logo", e.target.value)}
                />
            ),
        },
        {
            label: "Current purse",
            content: (
                <Input
                    type="text"
                    value={
                        selectedTeam?.registeredAuction?.length
                            ? formatMoney(selectedTeam.registeredAuction[selectedTeam.registeredAuction.length - 1].purseRemaining)
                            : "Not in an auction"
                    }
                    disabled
                    className="border border-slate-300 shadow-sm"
                />
            ),
        },
        {
            label: "Current Squad Size",
            content: (
                <Input
                    type="number"
                    value={editFormData.players?.length || 0}
                    onChange={(e) => handleInputChange("currentSquadSize", e.target.value)}
                    className="border border-slate-300 shadow-sm"
                    disabled={true}
                />
            ),
        },
        {
            label: "Overseas Count",
            content: (
                <Input
                    type="text"
                    value={editFormData.overseasCount || 0}
                    onChange={(e) => handleInputChange("overseasCount", e.target.value)}
                    className="border border-slate-300 shadow-sm"
                    disabled
                />
            ),
        },
        {
            label: "Owner",
            content: (
                <Input
                    type="text"
                    value={editFormData.owner || ""}
                    className="border border-slate-300 shadow-sm"
                    onChange={(e) => handleInputChange("owner", e.target.value)}
                    // readOnly
                />
            ),
        },
    ];

    const [deleteOpen, setDeleteOpen] = useState(false);
    const handleDelete = async () => {
        {
            try {
                const res = await deleteTeam({ id });
                if (res.data?.success === true) {
                    dispatch(setSelectedTeam(null));
                    navigate("/dashboard/teams");
                    toast.success("Team deleted successfully");
                } else {
                    setErrMsg(res.error.data.message);
                    setTimeout(() => setErrMsg(null), 7000);
                    toast.error("Failed to create player");
                }
            } catch (error) {
                setErrMsg(error.data.message);
                setTimeout(() => setErrMsg(null), 7000);
                toast.error("Failed to create player");
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
                                    Edit Team Details
                                </h2>
                                <p className="mt-1 text-sm text-navy-800">Manage team information and statistics</p>
                            </div>
                            <div className="flex-shrink-0">
                                <ConfirmDialog
                                    open={deleteOpen}
                                    onOpenChange={setDeleteOpen}
                                    title="Delete this team?"
                                    description={`${editFormData.name || "This team"} will be permanently deleted. This can't be undone.`}
                                    confirmLabel="Delete team"
                                    onConfirm={handleDelete}
                                />
                                <Button
                                    variant="outline"
                                    onClick={() => setDeleteOpen(true)}
                                    className="flex items-center border border-red-500 bg-red-50 text-red-500 gap-2 transition-all hover:bg-red-500 hover:text-white active:bg-red-700 shadow-sm hover:shadow-md"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="hidden sm:inline">Delete Team</span>
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
                        onClick={handleCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="w-full sm:w-auto bg-navy-700 border border-slate-300 hover:bg-navy-800 shadow-md hover:shadow-lg"
                        onClick={handleSave}
                    >
                        {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>
        </>
    );
};
// TeamDetailsTabs Component
const TeamDetailsTabs = ({ auction }) => {
    if (!auction) {
        return <EmptyState title="Nothing to show" hint="This team could not be loaded." />;
    }

    return (
        <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full md:w-1/2 grid-cols-3 bg-slate-100 shadow-sm border border-slate-300">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="players">Players</TabsTrigger>
                <TabsTrigger value="add-players">Add Players</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="bg-white">
                <TeamForm auction={auction} />
            </TabsContent>
            <TabsContent value="players">
                {auction.players && auction.players.length > 0 ? (
                    <AdminsTeamPlayerView players={auction.players} auctionId={auction._id} />
                ) : (
                    <EmptyState icon={Users} title="No players in this squad" hint="Players join a team when they are sold in an auction, or you can add them from the Add Players tab." />
                )}
            </TabsContent>
            <TabsContent value="add-players">
                <AddPlayersToTeam auction={auction} />
            </TabsContent>
        </Tabs>
    );
};

// Main AuctionDetails Component
const AuctionDetails = () => {
    const dispatch = useDispatch();
    const selectedAuction = useSelector((state) => state.teams.selectedTeam);
    const { id } = useParams();
    const navigate = useNavigate();

    const {
        data: auction,
        isLoading,
        error,
    } = useGetTeamsByIdQuery(id, {
        refetchOnMountOrArgChange: true,
    });

    useEffect(() => {
        if (auction) {
            dispatch(setSelectedTeam(auction));
        }
    }, [auction, dispatch]);

    if (isLoading || (!error && (!auction || selectedAuction?._id !== auction._id))) return <LoadingSpinner />;
    if (error) {
        return (
            <ErrorState inline error={error} what="team" backLabel="Back to teams" onBack={() => { dispatch(setSelectedTeam(null)); navigate("/dashboard/teams"); }} onRetry={() => window.location.reload()} />
        );
    }

    return (
        <div className="container mx-auto bg-white p-2 rounded-md">
            <Button
                variant="ghost"
                onClick={() => {
                    navigate("/dashboard/teams");
                    dispatch(setSelectedTeam(null));
                }}
                className="mb-4 hover:bg-slate-100"
            >
                <ArrowLeft /> Back to Teams
            </Button>

            <TeamDetailsTabs auction={selectedAuction} />
        </div>
    );
};

export default AuctionDetails;
