"use client";
import { formatMoney } from "../lib/money";
import * as React from "react";
import { flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, useReactTable, } from "@tanstack/react-table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "./ui/dropdown-menu";
import { AlertTriangle, MoreHorizontal, Trash2 } from "lucide-react";
import { useDeleteTeamFromAuctionMutation } from "../api/auctionApi.js";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { useGetAuctionByIdQuery } from "../api/auctionApi";
import LoadSpinner from "./LoadSpinner.jsx";
import { setSelectedAuction } from "../store/auctionSlice.js";
import { useNavigate, useParams } from "react-router-dom";
import ConfirmDialog from "./ConfirmDialog";
function AdminsPlayerView() {
    const dispatch = useDispatch();
    const { id } = useParams();
    const selectedAuction = useSelector((state) => state.auctions.selectedAuction);
    const [errMsg, setErrMsg] = React.useState(null);
    // Fetch auction data
    const { data: auctionData, error: auctionError, isLoading: auctionLoading, } = useGetAuctionByIdQuery(id, {
        skip: !id,
    });
    const [deleteTeamFromAuction] = useDeleteTeamFromAuctionMutation();
    const handleDeleteTeam = async (teamId) => {
        try {
            const res = await deleteTeamFromAuction({ id, teamId }).unwrap();
            if (res?.auction) {
                dispatch(setSelectedAuction(res.auction)); // Update Redux store with new auction data
                toast.success("Team removed successfully!");
            }
            else {
                console.warn("Unexpected response format:", res);
                toast.error("Failed to remove team. Please try again.");
            }
        }
        catch (error) {
            console.error("Error while removing team from auction:", error);
            setErrMsg(error?.data?.message || "An unexpected error occurred");
            setTimeout(() => setErrMsg(null), 10000);
            toast.error("Error while removing team from auction");
        }
    };
    // Update selectedAuction in Redux store if auctionData changes
    React.useEffect(() => {
        if (auctionData && !selectedAuction) {
            dispatch(setSelectedAuction(auctionData));
        }
    }, [auctionData, selectedAuction, dispatch]);
    const navigate = useNavigate();
    const [pendingRemoval, setPendingRemoval] = React.useState(null);
    // State for table data
    const [data, setData] = React.useState([]);
    const [sorting, setSorting] = React.useState([]);
    const [columnVisibility, setColumnVisibility] = React.useState({});
    const [rowSelection, setRowSelection] = React.useState({});
    // Initialize table data when selectedAuction changes
    React.useEffect(() => {
        if (selectedAuction?.teams) {
            const initialData = selectedAuction.teams.map((t) => {
                const purseRemaining = t?.team?.registeredAuction?.find((r) => {
                    return r.auctionId === id;
                })?.purseRemaining;
                return {
                    id: t?.team?._id,
                    name: t?.team?.name,
                    shortName: t?.team?.shortName,
                    logo: t?.team?.logo,
                    purseRemaining: purseRemaining,
                    players: t?.team?.players?.length,
                    currentSquadSize: t?.team?.currentSquadSize,
                    overseasCount: t?.team?.overseasCount,
                    owner: t?.team?.owner,
                    auctionStatus: t?.auctionStatus,
                    spent: auctionData?.settings?.maxPursePerTeam - purseRemaining,
                };
            });
            setData(initialData);
        }
    }, [selectedAuction, id, auctionData?.settings?.maxPursePerTeam]);
    // Table columns
    const columns = React.useMemo(() => [
        {
            id: "SINO",
            header: "#",
            cell: ({ row }) => <div>{row.index + 1}</div>,
            enableSorting: false,
            enableHiding: false,
            size: 10,
        },
        {
            accessorKey: "logo",
            header: "Image",
            cell: ({ row }) => (<TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <img src={row.getValue("logo")} alt={row.getValue("name")} className="w-10 h-10 rounded-full"/>
                            </TooltipTrigger>
                            <TooltipContent>
                                <img src={row.getValue("logo")} alt={row.getValue("name")} className="w-32 h-32"/>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>),
        },
        {
            accessorKey: "name",
            header: "Team Name",
            cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>,
            enableSorting: true,
        },
        {
            accessorKey: "purseRemaining",
            header: "Purse",
            cell: ({ row }) => {
                const price = parseFloat(row.getValue("purseRemaining"));
                return <div className="font-medium">{formatMoney(price)}</div>;
            },
        },
        {
            accessorKey: "spent",
            header: "Spent",
            cell: ({ row }) => {
                const price = parseFloat(row.getValue("spent"));
                return <div className="font-medium">{formatMoney(Math.max(price, 0))}</div>;
            },
        },
        {
            accessorKey: "players",
            header: "Players",
            cell: ({ row }) => <div className="capitalize text-center">{row.getValue("players")}</div>,
            size: 10,
        },
        {
            accessorKey: "currentSquadSize",
            header: "Size",
            cell: ({ row }) => <div className="capitalize text-center">{row.getValue("currentSquadSize")}</div>,
        },
        {
            accessorKey: "overseasCount",
            header: "Overseas",
            cell: ({ row }) => <div className="capitalize text-center">{row.getValue("overseasCount")}</div>,
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const team = row.original;
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
                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(team.id)}>
                                    Copy team ID
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/dashboard/teams/${team.id}`)}>
                                    View team details
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600 hover:bg-red-50" onClick={() => setPendingRemoval(team)}>
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
            <ConfirmDialog open={!!pendingRemoval} onOpenChange={(open) => !open && setPendingRemoval(null)} title="Remove team?" description={`${pendingRemoval?.name ?? "This team"} will leave this auction. You can add it back while the auction hasn't started.`} confirmLabel="Remove team" onConfirm={() => {
            handleDeleteTeam(pendingRemoval?.id);
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
                <Input placeholder="Search teams..." value={table.getState().globalFilter ?? ""} onChange={(event) => table.setGlobalFilter(event.target.value)} className="max-w-sm border border-slate-300"/>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="ml-auto max-w-sm border border-slate-300">
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
                                <TableCell colSpan={columns.length} className="h-24 text-center">
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
                        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="px-3 py-1 text-sm border border-slate-300  bg-navy-700 text-white hover:bg-navy-800 hover:text-white">
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        </div>);
}
export default AdminsPlayerView;
