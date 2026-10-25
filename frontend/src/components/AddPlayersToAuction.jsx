import { Trophy } from "lucide-react";
import EmptyState from "./EmptyState";
import * as React from "react";
import StatusPill from "./StatusPill";
import { formatMoney } from "../lib/money";
import { flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, useReactTable, } from "@tanstack/react-table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { setSelectedAuction } from "../store/auctionSlice.js";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useDispatch, useSelector } from "react-redux";
import LoadSpinner from "./LoadSpinner.jsx";
import { useParams, useNavigate } from "react-router-dom";
import { useGetAvailablePlayersQuery, useAddPlayersToAuctionMutation } from "../api/auctionApi";
function AdminsPlayerView() {
    const dispatch = useDispatch();
    const selectedAuction = useSelector((state) => state.auctions.selectedAuction);
    const { id } = useParams();
    const navigate = useNavigate();
    // Only fetch if id is defined
    const { data: players, isLoading: dataLoading, isError, refetch, } = useGetAvailablePlayersQuery(id, {
        refetchOnMountOrArgChange: true,
        skip: !id, // Skip the query if id is undefined
    });
    const locked = !!selectedAuction?.status && selectedAuction.status !== "scheduled";
    const [data, setData] = React.useState([]);
    const [sorting, setSorting] = React.useState([]);
    const [columnVisibility, setColumnVisibility] = React.useState({
        soldPrice: false,
        "battingStats_average": false,
        "battingStats_strike_rate": false,
        "bowlingStats_wickets": false,
        "bowlingStats_economy": false,
        "bowlingStats_average": false,
    });
    const [rowSelection, setRowSelection] = React.useState({});
    // Redirect if no ID is available
    React.useEffect(() => {
        if (!id) {
            toast.error("No auction selected. Redirecting to auctions list.");
            navigate("/auctions"); // Adjust this path to your auctions list page
        }
    }, [id, navigate]);
    React.useEffect(() => {
        if (players) {
            const initialData = players.map((p) => {
                return {
                    id: p._id,
                    name: p.name,
                    role: p.role,
                    battingStyle: p.battingStyle,
                    bowlingStyle: p.bowlingStyle,
                    basePrice: p.basePrice,
                    soldPrice: p.soldPrice || 0,
                    status: p.status,
                    team: p.currentTeam || "",
                    image: p.image,
                    battingStats: {
                        runs: p.battingStats?.runs || 0,
                        average: p.battingStats?.average || 0,
                        strike_rate: p.battingStats?.strike_rate || 0,
                    },
                    bowlingStats: {
                        wickets: p.bowlingStats?.wickets || 0,
                        economy: p.bowlingStats?.economy || 0,
                        average: p.bowlingStats?.average || 0,
                    },
                };
            });
            setData(initialData);
            const initialSelection = {};
            initialData.forEach((player, index) => {
                if (player.team === id) {
                    initialSelection[index] = true;
                }
            });
            setRowSelection(initialSelection);
        }
    }, [players, id]);
    // Table columns
    const columns = React.useMemo(() => [
        {
            id: "select",
            header: ({ table }) => {
                return (<Checkbox checked={table.getIsAllRowsSelected()} onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)} aria-label="Select all"/>);
            },
            cell: ({ row }) => (<Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="Select row"/>),
            enableSorting: false,
            enableHiding: false,
        },
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
            accessorKey: "role",
            header: "Role",
            cell: ({ row }) => <div className="capitalize">{row.getValue("role")}</div>,
        },
        {
            accessorKey: "battingStyle",
            header: "Batting Style",
            cell: ({ row }) => <div className="capitalize">{row.getValue("battingStyle")}</div>,
        },
        {
            accessorKey: "bowlingStyle",
            header: "Bowling Style",
            cell: ({ row }) => <div className="capitalize">{row.getValue("bowlingStyle")}</div>,
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
            accessorKey: "soldPrice",
            header: "Sold Price",
            cell: ({ row }) => {
                const price = parseFloat(row.getValue("soldPrice"));
                return <div className="font-medium">{formatMoney(price)}</div>;
            },
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => <StatusPill value={row.getValue("status")}/>,
        },
        {
            accessorKey: "battingStats.runs",
            header: "Runs",
            cell: ({ row }) => <div>{row.original.battingStats.runs}</div>,
        },
        {
            accessorKey: "battingStats.average",
            header: "Batting Avg",
            cell: ({ row }) => <div>{row.original.battingStats.average}</div>,
        },
        {
            accessorKey: "battingStats.strike_rate",
            header: "Strike Rate",
            cell: ({ row }) => <div>{row.original.battingStats.strike_rate}</div>,
        },
        {
            accessorKey: "bowlingStats.wickets",
            header: "Wickets",
            cell: ({ row }) => <div>{row.original.bowlingStats.wickets}</div>,
        },
        {
            accessorKey: "bowlingStats.economy",
            header: "Economy",
            cell: ({ row }) => <div>{row.original.bowlingStats.economy}</div>,
        },
        {
            accessorKey: "bowlingStats.average",
            header: "Bowling Avg",
            cell: ({ row }) => <div>{row.original.bowlingStats.average}</div>,
        },
    ], []);
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
    });
    const handleCancel = () => {
        if (players?.players) {
            const initialData = players.players.map((p) => {
                return {
                    id: p._id,
                    name: p.name,
                    role: p.role,
                    battingStyle: p.battingStyle,
                    bowlingStyle: p.bowlingStyle,
                    basePrice: p.basePrice,
                    soldPrice: p.soldPrice || 0,
                    status: p.status,
                    team: p.currentTeam || "N/A",
                    image: p.image,
                    battingStats: {
                        runs: p.battingStats?.runs || 0,
                        average: p.battingStats?.average || 0,
                        strike_rate: p.battingStats?.strike_rate || 0,
                    },
                    bowlingStats: {
                        wickets: p.bowlingStats?.wickets || 0,
                        economy: p.bowlingStats?.economy || 0,
                        average: p.bowlingStats?.average || 0,
                    },
                };
            });
            setData(initialData);
        }
    };
    const [addPlayersToAuction, { isLoading: isSubmitting }] = useAddPlayersToAuctionMutation();
    const handleSendSelectedPlayers = async () => {
        if (!id) {
            toast.error("No auction selected!");
            return;
        }
        const selectedPlayers = Object.keys(rowSelection).map((index) => data[Number(index)]);
        if (selectedPlayers.length === 0) {
            toast.error("No players selected!");
            return;
        }
        const updatedData = selectedPlayers.map((p) => p.id);
        try {
            const res = await addPlayersToAuction({ id, players: updatedData }).unwrap();
            dispatch(setSelectedAuction(res.auction));
            refetch();
            toast.success("Selected players sent successfully!");
        }
        catch (error) {
            toast.error(`${error.data?.message || "Failed to add players to auction"}`);
        }
    };
    // Show error state if API call fails
    if (isError) {
        return (<EmptyState icon={Trophy} title="No players available" hint="The player list couldn't be loaded. Refresh the page and try again."/>);
    }
    if (dataLoading)
        return <LoadSpinner />;
    // Early return if no valid ID
    if (!id) {
        return (<Alert className="my-4">
                <AlertTriangle className="h-4 w-4"/>
                <AlertTitle>No Auction Selected</AlertTitle>
                <AlertDescription>Please select an auction to view its available players.</AlertDescription>
            </Alert>);
    }
    // Check if players exist but array is empty
    if (players && (!Array.isArray(players) || players.length === 0)) {
        return <EmptyState icon={Trophy} title="No players to add" hint="Every player is already in this auction. Create or import more players first."/>;
    }
    return (<div className="w-full">
            {locked && (<Alert className="mt-2 border-gold-300 bg-gold-300/20">
                    <AlertTriangle className="h-4 w-4"/>
                    <AlertTitle>Players can no longer be added</AlertTitle>
                    <AlertDescription>
                        This auction has already {selectedAuction?.status === "completed" ? "finished" : "opened"}. The player list is fixed once an auction opens.
                    </AlertDescription>
                </Alert>)}
            <div className="flex items-center py-4 gap-2">
                <Input placeholder="Search players..." value={table.getState().globalFilter ?? ""} onChange={(event) => table.setGlobalFilter(event.target.value)} className="max-w-sm border border-slate-300"/>
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
                    <TableHeader className="bg-navy-900">
                        {table.getHeaderGroups().map((headerGroup) => (<TableRow key={headerGroup.id} className="hover:bg-navy-900">
                                {headerGroup.headers.map((header) => (<TableHead key={header.id} className="text-white">
                                        {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>))}
                            </TableRow>))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (table.getRowModel().rows.map((row) => (<TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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
                        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                            Previous
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                            Next
                        </Button>
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-4 py-4">
                <Button variant="outline" size="lg" onClick={handleCancel} className="text-muted-foreground">
                    Cancel
                </Button>
                <Button variant="default" size="lg" onClick={handleSendSelectedPlayers} disabled={isSubmitting || !id || locked} className="bg-navy-700 text-white">
                    {isSubmitting ? "Submitting..." : "Send Selected Players"}
                </Button>
            </div>
        </div>);
}
export default AdminsPlayerView;
