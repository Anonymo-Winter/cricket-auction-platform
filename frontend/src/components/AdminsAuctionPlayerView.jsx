"use client";
import StatusPill from "./StatusPill";
import { formatMoney } from "../lib/money";
import * as React from "react";
import { flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, useReactTable, } from "@tanstack/react-table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "./ui/dropdown-menu";
import { AlertTriangle, MoreHorizontal, Trash2 } from "lucide-react";
import { useMarkPlayersMutation } from "../api/auctionApi.js";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useDispatch, useSelector } from "react-redux";
import { useGetAuctionByIdQuery, useDeletePlayerFromAuctionMutation } from "../api/auctionApi";
import LoadSpinner from "./LoadSpinner.jsx";
import { setSelectedAuction } from "../store/auctionSlice.js";
import { useNavigate, useParams } from "react-router-dom";
import ConfirmDialog from "./ConfirmDialog";
import { motion } from "framer-motion";
function AdminsPlayerView() {
    const dispatch = useDispatch();
    const { id } = useParams();
    const selectedAuction = useSelector((state) => state.auctions.selectedAuction);
    const [deletePlayerFromAuction] = useDeletePlayerFromAuctionMutation();
    const [errMsg, setErrMsg] = React.useState(null);
    const navigate = useNavigate();
    const { data: auctionData, error: auctionError, isLoading: auctionLoading, refetch, } = useGetAuctionByIdQuery(id, {
        skip: !id,
        refetchOnMountOrArgChange: true,
    });
    const handleDeletePlayerFromTeam = async (playerId) => {
        try {
            const res = await deletePlayerFromAuction({ id, playerId }).unwrap();
            if (res?.auction) {
                dispatch(setSelectedAuction(res.auction));
                refetch();
                toast.success("Player removed successfully!");
            }
            else {
                console.warn("Unexpected response format:", res);
                toast.error("Failed to remove team. Please try again.");
            }
        }
        catch (error) {
            console.error("Error while removing player from auction : ", error);
            setErrMsg(error?.data?.message || "An unexpected error occurred");
            setTimeout(() => setErrMsg(null), 10000);
            toast.error(error.data?.message);
        }
    };
    // Update selectedAuction in Redux store if auctionData changes
    React.useEffect(() => {
        if (auctionData && !selectedAuction) {
            dispatch(setSelectedAuction(auctionData));
        }
    }, [auctionData, selectedAuction, dispatch]);
    const [pendingRemoval, setPendingRemoval] = React.useState(null);
    // State for table data
    const [data, setData] = React.useState([]);
    const [sorting, setSorting] = React.useState([]);
    const [columnVisibility, setColumnVisibility] = React.useState({});
    const [rowSelection, setRowSelection] = React.useState({});
    React.useEffect(() => {
        if (selectedAuction?.players) {
            const initialData = selectedAuction.players.map((p) => {
                return {
                    id: p.player?._id,
                    name: p.player?.name,
                    team: p.player?.currentTeam ?? "N/A",
                    basePrice: p.player?.basePrice ?? 0,
                    status: p?.status,
                    set: p.set ?? null,
                    image: p.player?.image,
                };
            });
            setData(initialData);
        }
    }, [selectedAuction]);
    const [markPlayers, { isLoading }] = useMarkPlayersMutation();
    const handleSave = async () => {
        try {
            const playersData = data.map((player) => ({ id: player.id, set: player.set }));
            await markPlayers({ auctionId: id, playersData }).unwrap();
            // Update selectedAuction in Redux store
            const updatedAuction = {
                ...selectedAuction,
                players: selectedAuction.players.map((p) => ({
                    ...p,
                    set: data.find((d) => d.id === p.player._id)?.set ?? null,
                })),
            };
            dispatch(setSelectedAuction(updatedAuction));
            toast.success("Players saved successfully");
        }
        catch (error) {
            console.error("Error saving players:", error);
            toast.error("Error saving players");
        }
    };
    const handleCancel = () => {
        if (selectedAuction?.players) {
            const initialData = selectedAuction.players.map((p) => ({
                id: p.player._id,
                name: p.player.name,
                team: p.player.currentTeam ?? "N/A",
                basePrice: p.player.basePrice ?? 0,
                status: p.status,
                set: p.set ?? null,
                image: p.player.image,
            }));
            setData(initialData);
        }
    };
    const columns = React.useMemo(() => [
        {
            id: "SINO",
            header: "#",
            cell: ({ row }) => <div>{row.index + 1}</div>,
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "image",
            header: "Image",
            cell: ({ row }) => (<TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <img src={row.getValue("image")} alt={row.getValue("name")} className="w-10 h-10 rounded-full"/>
                            </TooltipTrigger>
                            <TooltipContent>
                                <img src={row.getValue("image")} alt={row.getValue("name")} className="w-20 h-20"/>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>),
        },
        {
            accessorKey: "name",
            header: "Player Name",
            cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>,
        },
        {
            accessorKey: "basePrice",
            header: "Base Price",
            cell: ({ row }) => {
                const price = parseFloat(row.getValue("basePrice"));
                return <div className="font-medium">{formatMoney(price)}</div>;
            },
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => <StatusPill value={row.getValue("status")}/>,
        },
        {
            id: "setMarquee",
            header: () => {
                return <div className="text-center">Marquee</div>;
            },
            cell: ({ row, table }) => (<div className="text-center">
                        <Checkbox checked={row.original.set === "marquee"} onCheckedChange={(checked) => {
                    table.options.meta?.updateSet(row.original.id, checked ? "marquee" : null);
                }} className="mx-auto"/>
                    </div>),
        },
        {
            id: "setCapped",
            header: () => {
                return <div className="text-center">Capped</div>;
            },
            cell: ({ row, table }) => (<div className="text-center">
                        <Checkbox checked={row.original.set === "capped"} onCheckedChange={(checked) => {
                    table.options.meta?.updateSet(row.original.id, checked ? "capped" : null);
                }}/>
                    </div>),
        },
        {
            id: "setUncapped",
            header: () => {
                return <div className="text-center">Uncapped</div>;
            },
            cell: ({ row, table }) => (<div className="text-center">
                        <Checkbox checked={row.original.set === "uncapped"} onCheckedChange={(checked) => {
                    table.options.meta?.updateSet(row.original.id, checked ? "uncapped" : null);
                }}/>
                    </div>),
        },
        {
            id: "setAccelerated",
            header: () => {
                return <div className="text-center">Accelerated</div>;
            },
            cell: ({ row, table }) => (<div className="text-center">
                        <Checkbox checked={row.original.set === "accelerated"} onCheckedChange={(checked) => {
                    table.options.meta?.updateSet(row.original.id, checked ? "accelerated" : null);
                }}/>
                    </div>),
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const player = row.original;
                return (<DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>

                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(player.id)}>
                                    Copy player ID
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={() => navigate(`/dashboard/players/${player.id}`)}>
                                    View player details
                                </DropdownMenuItem>

                                <DropdownMenuItem className="text-red-600 hover:bg-red-50" onClick={() => setPendingRemoval(player)}>
                                    <Trash2 className="mr-2 h-4 w-4"/>
                                    Remove from auction
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>);
            },
        },
    ], [navigate]);
    // React Table instance
    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnVisibility,
            rowSelection,
        },
        meta: {
            updateSet: (playerId, newSet) => {
                setData((prevData) => prevData.map((player) => (player.id === playerId ? { ...player, set: newSet } : player)));
            },
        },
    });
    if (auctionLoading)
        return <LoadSpinner />;
    if (auctionError) {
        toast.error("Something went Wrong. Please Try Again!");
        return <div>Error fetching auction data.</div>;
    }
    return (<div className="w-full bg-white">
            <ConfirmDialog open={!!pendingRemoval} onOpenChange={(open) => !open && setPendingRemoval(null)} title="Remove player?" description={`${pendingRemoval?.name ?? "This player"} will be taken out of this auction's player list.`} confirmLabel="Remove player" onConfirm={() => {
            handleDeletePlayerFromTeam(pendingRemoval?.id);
            setPendingRemoval(null);
        }}/>
            {errMsg && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="mt-3">
                    <Alert variant="destructive" className="border-red-500 bg-red-50 flex flex-row gap-1">
                        <AlertTitle className="flex items-center gap-2 text-red-700">
                            <AlertTriangle className="w-5 h-5"/>
                            Error:
                        </AlertTitle>
                        <AlertDescription className="text-red-600">{errMsg}</AlertDescription>
                    </Alert>
                </motion.div>)}
            <div className="flex items-center py-4 gap-2">
                <Input placeholder="Search players..." value={table.getState().globalFilter ?? ""} onChange={(event) => table.setGlobalFilter(event.target.value)} className="max-w-sm border border-slate-300 shadow-sm"/>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="ml-auto border border-slate-300">
                            Columns
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {table
            .getAllColumns()
            .filter((column) => column.getCanHide())
            .map((column) => (<DropdownMenuCheckboxItem key={column.id} className="capitalize" checked={column.getIsVisible()} onCheckedChange={(value) => column.toggleVisibility(!!value)}>
                                    {column.id}
                                </DropdownMenuCheckboxItem>))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader className="bg-navy-900 text-white">
                        {table.getHeaderGroups().map((headerGroup) => (<TableRow key={headerGroup.id} className="hover:bg-navy-900">
                                {headerGroup.headers.map((header) => (<TableHead key={header.id} className="text-gray-100">
                                        {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>))}
                            </TableRow>))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (table.getRowModel().rows.map((row) => (<TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="hover:bg-slate-100">
                                    {row.getVisibleCells().map((cell) => (<TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>))}
                                </TableRow>))) : (<TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-navy-700">
                                    No results.
                                </TableCell>
                            </TableRow>)}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-between px-2 py-4">
                <div className="text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length}{" "}
                    row(s) selected
                </div>

                <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">Rows per page</p>
                        <select value={table.getState().pagination.pageSize} onChange={(e) => {
            table.setPageSize(Number(e.target.value));
        }} className="h-8 w-[70px] border border-slate-300 rounded-md">
                            {[10, 20, 30, 40, 50].map((pageSize) => (<option key={pageSize} value={pageSize}>
                                    {pageSize}
                                </option>))}
                        </select>
                    </div>

                    <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="px-3 py-1 text-sm border border-slate-300  bg-navy-700 text-white hover:bg-navy-800 hover:text-white">
                            Previous
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => table.nextPage()} className="px-3 py-1 text-sm border border-slate-300  bg-navy-700 text-white hover:bg-navy-800 hover:text-white" disabled={!table.getCanNextPage()}>
                            Next
                        </Button>
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-4 py-4">
                <Button variant="outline" size="lg" onClick={handleCancel} className="text-muted-foreground">
                    Cancel
                </Button>
                <Button variant="default" size="lg" onClick={handleSave} disabled={isLoading} className="bg-navy-700 text-white">
                    {isLoading ? "Saving Changes" : "Save Changes"}
                </Button>
            </div>
        </div>);
}
export default AdminsPlayerView;
