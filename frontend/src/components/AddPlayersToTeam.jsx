import { Trophy } from "lucide-react";
import EmptyState from "./EmptyState";
import * as React from "react";
import StatusPill from "./StatusPill";
import { formatMoney } from "../lib/money";
import { flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, useReactTable, } from "@tanstack/react-table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { setSelectedTeam } from "../store/teamSlice.js";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger, } from "./ui/dropdown-menu";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import LoadSpinner from "./LoadSpinner.jsx";
import { useParams } from "react-router-dom";
import { useGetAvailablePlayersQuery } from "../api/playerApi";
import { useMarkPlayersToTeamMutation } from "../api/teamApi";
function AdminsPlayerView() {
    const dispatch = useDispatch();
    const { id } = useParams();
    const { data: players, isLoading: dataLoading, refetch, } = useGetAvailablePlayersQuery(id, {
        refetchOnMountOrArgChange: true,
    });
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
    React.useEffect(() => {
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
                                <img src={row.getValue("image") ||
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTkkE1LSJXHRCOSWyn1wFq8RhGSO8_geSROkA&s"} alt={row.getValue("name")} className="w-10 h-10 rounded-full"/>
                            </TooltipTrigger>
                            <TooltipContent>
                                <img src={row.getValue("image") ||
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTkkE1LSJXHRCOSWyn1wFq8RhGSO8_geSROkA&s"} alt={row.getValue("name")} className="w-20 h-20"/>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>),
        },
        {
            accessorKey: "name",
            header: "Name",
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
    const [markPlayersToTeam, { isLoading: isSubmitting }] = useMarkPlayersToTeamMutation();
    const handleSendSelectedPlayers = async () => {
        const selectedPlayers = Object.keys(rowSelection).map((index) => data[Number(index)]);
        if (selectedPlayers.length === 0) {
            toast.error("No Players Selected!");
            return;
        }
        const updatedData = selectedPlayers.map((p) => ({ id: p.id, teamId: id }));
        try {
            const res = await markPlayersToTeam({ teamId: id, updatedData: updatedData }).unwrap();
            dispatch(setSelectedTeam(res.team));
            refetch();
            toast.success("Player(s) added to Team!");
        }
        catch (error) {
            toast.error("Error sending players");
        }
    };
    if (!players)
        return (<EmptyState icon={Trophy} title="No players available" hint="There are no players to add right now."/>);
    if (dataLoading)
        return <LoadSpinner />;
    return (<div className="w-full">
            <div className="flex items-center py-4 gap-2">
                <Input placeholder="Search players..." value={table.getState().globalFilter ?? ""} onChange={(event) => table.setGlobalFilter(event.target.value)} className="max-w-sm border border-slate-300"/>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="ml-auto border-slate-300">
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
            <div className="p-1">
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
                                <TableCell colSpan={columns.length} className="h-24 text-center text-navy-700 bg-slate-50">
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
            <div className="flex justify-end gap-4 py-4">
                <Button variant="outline" size="lg" onClick={handleCancel} className="text-muted-foreground">
                    Cancel
                </Button>
                <Button variant="default" size="lg" onClick={handleSendSelectedPlayers} disabled={isSubmitting} className="bg-navy-700 hover:bg-navy-800 text-white">
                    {isSubmitting ? "Submitting..." : "Add Players"}
                </Button>
            </div>
        </div>);
}
export default AdminsPlayerView;
