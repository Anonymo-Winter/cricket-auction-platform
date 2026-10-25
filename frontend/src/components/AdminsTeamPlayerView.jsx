import * as React from "react";
import StatusPill from "./StatusPill";
import { formatMoney } from "../lib/money";
import { flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, useReactTable, } from "@tanstack/react-table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "./ui/dropdown-menu";
import { setSelectedTeam } from "../store/teamSlice.js";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "./ConfirmDialog";
import { useDeletePlayerFromTeamMutation } from "../api/teamApi.js";
// Row menu with its own confirm dialog state (hooks can't live inside a table cell renderer)
function PlayerRowActions({ player, navigate, onRemove }) {
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    return (<>
                            <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Remove player from team?" description={`${player.name ?? "This player"} will leave this team's squad.`} confirmLabel="Remove player" onConfirm={() => onRemove(player)}/>
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(player.id)}>
                                        Copy player ID
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => navigate(`/dashboard/players/${player.id}`)}>
                                        View player details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setConfirmOpen(true)} className="text-red-500">
                                        <div className="flex items-center gap-2">
                                            <Trash2 className="size-4"/> Remove from team
                                        </div>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
</>);
}
function AdminsPlayerView() {
    const dispatch = useDispatch();
    const selectedTeam = useSelector((state) => state.teams.selectedTeam);
    const navigate = useNavigate();
    const [data, setData] = React.useState([]);
    const [sorting, setSorting] = React.useState([]);
    const [columnVisibility, setColumnVisibility] = React.useState({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [deletePlayerFromTeam] = useDeletePlayerFromTeamMutation();
    React.useEffect(() => {
        if (selectedTeam?.players) {
            const initialData = selectedTeam.players
                .map((p) => {
                if (p && p.player) {
                    const { player } = p;
                    const { battingStats, bowlingStats } = player;
                    return {
                        id: player._id,
                        name: player.name,
                        role: player.role,
                        battingStyle: player.battingStyle,
                        bowlingStyle: player.bowlingStyle,
                        basePrice: player.basePrice,
                        soldPrice: p.soldPrice || 0,
                        status: player.status,
                        team: p.team || "N/A",
                        image: player.image,
                        battingStats: {
                            runs: battingStats?.runs || 0,
                            average: battingStats?.average || 0,
                            strike_rate: battingStats?.strike_rate || 0,
                        },
                        bowlingStats: {
                            wickets: bowlingStats?.wickets || 0,
                            economy: bowlingStats?.economy || 0,
                            average: bowlingStats?.average || 0,
                        },
                    };
                }
                else {
                    return null; // Or handle the case where p or p.player is missing differently
                }
            })
                .filter(Boolean); // Remove any null entries from the array
            setData(initialData);
        }
    }, [selectedTeam]);
    // Table columns
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
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => (<PlayerRowActions player={row.original} navigate={navigate} onRemove={async (player) => {
                    const res = await deletePlayerFromTeam({ playerId: player.id, teamId: selectedTeam._id });
                    dispatch(setSelectedTeam(res.data.team));
                }}/>),
        },
    ], [deletePlayerFromTeam, dispatch, navigate, selectedTeam?._id]);
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
    if (!selectedTeam)
        return <div>No team selected.</div>;
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
                        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="px-3 py-1 text-sm border border-slate-300  bg-navy-700 text-white hover:bg-navy-800 hover:text-white">
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        </div>);
}
export default AdminsPlayerView;
