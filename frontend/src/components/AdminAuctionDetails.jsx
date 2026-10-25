import ErrorState from "./ErrorState";
import { useGetAuctionByIdQuery, useUpdateAuctionMutation } from "../api/auctionApi.js";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedAuction } from "../store/auctionSlice.js";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import LoadingSpinner from "./LoadSpinner";
import AdminsPlayerView from "./AdminsAuctionPlayerView.jsx";
import AdminsTeamView from "./AdminsAuctionsTeamView.jsx";
import AddPlayersToAuction from "./AddPlayersToAuction.jsx";
import AddTeamsToAuction from "./AddTeamsToAuction.jsx";
import SetupChecklist from "./SetupChecklist.jsx";

import { Table, TableBody, TableCell, TableRow } from "./ui/table";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useNavigate, useParams } from "react-router-dom";
import EmptyState from "./EmptyState";
import ConfirmDialog from "./ConfirmDialog";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert.tsx";
import { AlertTriangle, ArrowLeft, ExternalLink, Trash2, Trophy, Users } from "lucide-react";
import { motion } from "framer-motion";

import { useDeleteAuctionMutation } from "../api/auctionApi.js";

// AuctionForm Component
const AuctionForm = ({ auction }) => {
    const dispatch = useDispatch();
    const selectedAuction = useSelector((state) => state.auctions.selectedAuction);
    const [updateAuction, { error, isLoading }] = useUpdateAuctionMutation();
    const [editFormData, setEditFormData] = useState({
        name: "",
        startTime: "",
        endTime: "",
        status: "",
        minBidIncrement: 100000,
        bidTimeLimit: 80,
        maxPursePerTeam: 100000000,
        maxOverseasPlayers: 8,
        maxSquadSize: 25,
        minSquadSize: 18,
    });
    const [deleteAuction] = useDeleteAuctionMutation();
    // Once an auction has opened, only its name can change (the server enforces this too)
    const locked = !["scheduled", "cancelled"].includes(auction.status);

    useEffect(() => {
        if (auction) {
            dispatch(setSelectedAuction(auction));
            setEditFormData({
                name: auction.name || "",
                startTime: auction.startTime ? format(new Date(auction.startTime), "yyyy-MM-dd'T'HH:mm") : "",
                endTime: auction.endTime ? format(new Date(auction.endTime), "yyyy-MM-dd'T'HH:mm") : "",
                status: auction.status || "",
                minBidIncrement: auction.settings.minBidIncrement || 100000,
                bidTimeLimit: auction.settings.bidTimeLimit || 80,
                maxPursePerTeam: auction.settings.maxPursePerTeam || 100000000,
                maxOverseasPlayers: auction.settings.maxOverseasPlayers || 8,
                maxSquadSize: auction.settings.maxSquadSize || 25,
                minSquadSize: auction.settings.minSquadSize || 18,
            });
        }
        // Seed the form once on mount; later edits must not be overwritten by refetches
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const { id } = useParams();

    const handleSave = async () => {
        try {
            // The inputs hold local time; send exact instants so the server doesn't read them in ITS timezone
            const payload = {
                ...editFormData,
                startTime: editFormData.startTime ? new Date(editFormData.startTime).toISOString() : editFormData.startTime,
                endTime: editFormData.endTime ? new Date(editFormData.endTime).toISOString() : editFormData.endTime,
            };
            await updateAuction({ id, updatedData: payload }).unwrap();
            const updatedAuction = {
                ...selectedAuction,
                ...payload,
            };
            setEditFormData({ ...editFormData, ...updateAuction });
            dispatch(setSelectedAuction(updatedAuction));
            toast.success("Auction details updated successfully!");
        } catch {
            toast.error("Failed to updated auction details!");
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
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="w-full border border-slate-300 shadow-sm"
                />
            ),
        },
        {
            label: "Public links",
            content: (
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                    {[
                        ["Live auction", `/auction/${auction._id}`],
                        ["Big screen", `/auction/${auction._id}/screen`],
                        ["Squads and CSV", `/auction/${auction._id}/squads`],
                    ].map(([label, path]) => (
                        <a
                            key={path}
                            href={path}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 font-medium text-navy-800 hover:underline"
                        >
                            {label}
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                    ))}
                </div>
            ),
        },
        {
            label: "Start Time",
            content: (
                <Input
                    type="datetime-local"
                    value={editFormData.startTime || ""}
                    disabled={locked}
                    onChange={(e) => handleInputChange("startTime", e.target.value)}
                    className="w-full border border-slate-300 shadow-sm"
                />
            ),
        },
        {
            label: "End Time",
            content: (
                <Input
                    type="datetime-local"
                    value={editFormData.endTime || ""}
                    disabled={locked}
                    onChange={(e) => handleInputChange("endTime", e.target.value)}
                    className="w-full border border-slate-300 shadow-sm"
                />
            ),
        },
        {
            label: "Status",
            content: (
                locked ? (
                    <div>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium capitalize text-gray-800">
                            {auction.status}
                        </span>
                        <p className="mt-1 text-xs text-gray-500">
                            An auction opens at its start time and then runs on its own clock, so its status can&apos;t be
                            changed by hand. Times and rules are locked once it has opened.
                        </p>
                    </div>
                ) : (
                    <Select value={editFormData.status} onValueChange={(value) => handleInputChange("status", value)}>
                        <SelectTrigger className="w-full border border-slate-300 shadow-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                )
            ),
        },
        {
            label: "Min Bid Increment",
            content: (
                <Select
                    value={String(editFormData.minBidIncrement)}
                    onValueChange={(value) => handleInputChange("minBidIncrement", Number(value))}
                    disabled={locked}
                >
                    <SelectTrigger className="w-full border border-slate-300 shadow-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="100000">1L</SelectItem>
                        <SelectItem value="200000">2L</SelectItem>
                        <SelectItem value="500000">5L</SelectItem>
                        <SelectItem value="1000000">10L</SelectItem>
                        <SelectItem value="2500000">25L</SelectItem>
                    </SelectContent>
                </Select>
            ),
        },
        {
            label: "Bid Time Limit",
            content: (
                <Input
                    type="number"
                    value={editFormData.bidTimeLimit ?? 30}
                    onChange={(e) => handleInputChange("bidTimeLimit", Number(e.target.value))}
                    min={5}
                    disabled={locked}
                    step={5}
                    className="w-full border border-slate-300 shadow-sm"
                />
            ),
        },
        {
            label: "Max Purse/Team",
            content: (
                <Input
                    type="number"
                    value={editFormData.maxPursePerTeam || 100000000}
                    onChange={(e) => handleInputChange("maxPursePerTeam", Number(e.target.value))}
                    min={1000000}
                    disabled={locked}
                    className="w-full border border-slate-300 shadow-sm"
                    step={10000000}
                />
            ),
        },
        {
            label: "Max Overseas Players",
            content: (
                <Input
                    type="number"
                    value={editFormData.maxOverseasPlayers || 8}
                    onChange={(e) => handleInputChange("maxOverseasPlayers", Number(e.target.value))}
                    min={0}
                    disabled={locked}
                    className="w-full border border-slate-300 shadow-sm"
                />
            ),
        },
        {
            label: "Squad Size",
            content: (
                <Input
                    type="number"
                    value={editFormData.maxSquadSize || 25}
                    onChange={(e) => handleInputChange("maxSquadSize", Number(e.target.value))}
                    disabled={locked}
                    min={editFormData.minSquadSize}
                    className="w-full border border-slate-300 shadow-sm"
                />
            ),
        },
    ];
    const navigate = useNavigate();

    const handleCancel = async () => {
        if (auction) {
            setEditFormData({
                name: auction.name || "",
                startTime: auction.startTime ? format(new Date(auction.startTime), "yyyy-MM-dd'T'HH:mm") : "",
                endTime: auction.endTime ? format(new Date(auction.endTime), "yyyy-MM-dd'T'HH:mm") : "",
                status: auction.status || "",
                minBidIncrement: auction.settings.minBidIncrement || 100000,
                bidTimeLimit: auction.settings.bidTimeLimit || 80,
                maxPursePerTeam: auction.settings.maxPursePerTeam || 100000000,
                maxOverseasPlayers: auction.settings.maxOverseasPlayers || 8,
                maxSquadSize: auction.settings.maxSquadSize || 25,
                minSquadSize: auction.settings.minSquadSize || 18,
            });
        }
    };

    const [deleteOpen, setDeleteOpen] = useState(false);
    const handleDeleteAuction = async () => {
        try {
            const res = await deleteAuction({ id: selectedAuction._id });
            if (res.data && res.data.status === 200) {
                dispatch(setSelectedAuction(null));
                toast.success("Auction Deleted Successfully!");
                navigate("/dashboard/auctions");
            } else {
                throw new Error(res.error?.data?.message || "Failed to delete auction");
            }
        } catch (error) {
            toast.error(error.message || "Failed to delete auction");
        }
    };

    return (
        <div className="bg-white">
            <div className="bg-white border-b border-slate-300">
                <div className="max-w-7xl mx-auto">
                    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
                            <div className="mt-3 pb-3 border-gray-200">
                                <h2 className="font-display tracking-tight text-navy-900 text-xl font-bold">Edit Auction Details</h2>
                                <p className="text-sm text-navy-800">Edit your auction details here.</p>
                            </div>
                            <div className="flex-shrink-0">
                                <ConfirmDialog
                                    open={deleteOpen}
                                    onOpenChange={setDeleteOpen}
                                    title="Delete this auction?"
                                    description={`${editFormData?.name || "This auction"} and everything recorded in it will be permanently deleted. This can't be undone.`}
                                    confirmLabel="Delete auction"
                                    onConfirm={handleDeleteAuction}
                                />
                                <Button
                                    variant="outline"
                                    onClick={() => setDeleteOpen(true)}
                                    className="flex items-center border border-red-500 bg-red-50 text-red-500 gap-2 transition-all hover:bg-red-500 hover:text-white active:bg-red-700 shadow-sm hover:shadow-md"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="hidden sm:inline">Delete Auction</span>
                                    <span className="sm:hidden">Delete</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {error && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-3"
                >
                    <Alert variant="destructive" className="border-red-500 bg-red-50 flex flex-row gap-1">
                        <AlertTitle className="flex items-center gap-2 text-red-700">
                            <AlertTriangle className="w-5 h-5" />
                            Error :
                        </AlertTitle>
                        <AlertDescription className="text-red-600">{error.data.message}</AlertDescription>
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

                <div className="flex justify-end sm:flex-row gap-3 mt-4">
                    <Button
                        variant="outline"
                        className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-100"
                        onClick={handleCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="w-full sm:w-auto bg-navy-700 border border-blue-700 hover:bg-navy-800 shadow-md hover:shadow-lg"
                        onClick={handleSave}
                    >
                        {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// AuctionDetailsTabs Component
const AuctionDetailsTabs = ({ auction }) => {
    if (!auction) {
        return <EmptyState title="Nothing to show" hint="This auction could not be loaded." />;
    }

    return (
        <div className="space-y-4">
        <SetupChecklist auction={auction} />
        <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full xl:w-1/2 grid-cols-3 sm:grid-cols-5 h-auto bg-slate-100 shadow-sm border border-slate-300">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="players">Players</TabsTrigger>
                <TabsTrigger value="teams">Teams</TabsTrigger>
                <TabsTrigger value="add-players">Add Players</TabsTrigger>
                <TabsTrigger value="add-teams">Add Teams</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
                <AuctionForm auction={auction} />
            </TabsContent>
            <TabsContent value="players">
                {auction.players && auction.players.length > 0 ? (
                    <AdminsPlayerView players={auction.players} auctionId={auction._id} />
                ) : (
                    <EmptyState icon={Trophy} title="No players yet" hint="Use the Add Players tab to pick who goes under the hammer." />
                )}
            </TabsContent>
            <TabsContent value="teams">
                {auction.teams && auction.teams.length > 0 ? (
                    <AdminsTeamView auction={auction} />
                ) : (
                    <EmptyState icon={Users} title="No teams yet" hint="Use the Add Teams tab, or let owners register themselves." />
                )}
            </TabsContent>
            <TabsContent value="add-players">
                <AddPlayersToAuction auction={auction} />
            </TabsContent>
            <TabsContent value="add-teams">
                <AddTeamsToAuction auction={auction} />
            </TabsContent>
        </Tabs>
        </div>
    );
};

// Main AuctionDetails Component
const AuctionDetails = () => {
    const dispatch = useDispatch();
    const selectedAuction = useSelector((state) => state.auctions.selectedAuction);
    const { id } = useParams();
    const navigate = useNavigate();

    const {
        data: auction,
        isLoading,
        error,
    } = useGetAuctionByIdQuery(id, {
        skip: !id && selectedAuction._id === id,
    });

    useEffect(() => {
        if (auction) {
            dispatch(setSelectedAuction(auction));
        }
    }, [auction, dispatch]);

    // Wait for THIS auction: the store may still hold whichever one was opened last
    if (isLoading || (!error && (!auction || selectedAuction?._id !== auction._id))) return <LoadingSpinner />;
    if (error) {
        return (
            <ErrorState inline error={error} what="auction" backLabel="Back to auctions" onBack={() => { dispatch(setSelectedAuction(null)); navigate("/dashboard/auctions"); }} onRetry={() => window.location.reload()} />
        );
        // return <div className="p-4 text-red-500 text-center">{error.data?.message || "Invalid auction ID"}</div>;
    }

    return (
        <div className="container mx-auto bg-white p-2 rounded-md">
            <Button
                variant="ghost"
                onClick={() => {
                    navigate("/dashboard/auctions");
                    dispatch(setSelectedAuction(null));
                }}
                className="mb-4 hover:bg-slate-100"
            >
                <ArrowLeft /> Back to Auctions
            </Button>

            <AuctionDetailsTabs auction={selectedAuction} />
        </div>
    );
};

export default AuctionDetails;
