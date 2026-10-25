import * as React from "react";
import { flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, useReactTable, } from "@tanstack/react-table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "./ui/checkbox.tsx";
import { Button } from "./ui/button.tsx";
import { Input } from "./ui/input.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table.tsx";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger, } from "./ui/dropdown-menu.tsx";
import { useDispatch } from "react-redux";
import EmptyState from "./EmptyState";
import LoadSpinner from "./LoadSpinner.jsx";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAddTeamsToAuctionMutation, useGetAllAvailableTeamsQuery } from "../api/auctionApi.js";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertTriangle, Users, X } from "lucide-react";
import { setSelectedAuction } from "../store/auctionSlice.js";
function TeamsDataTable() {
    const { id } = useParams();
    const [error, setError] = React.useState({
        visible: false,
        message: "",
        type: "error", // could be "error", "warning", "info"
    });
    const dispatch = useDispatch();
    const { data: teamsData, isLoading: dataLoading, error: fetchError, refetch, } = useGetAllAvailableTeamsQuery({ auctionId: id }, {
        refetchOnMountOrArgChange: true,
    });
    const [data, setData] = React.useState([]);
    const [sorting, setSorting] = React.useState([]);
    const [columnVisibility, setColumnVisibility] = React.useState({});
    const [rowSelection, setRowSelection] = React.useState({});
    // Set error from API fetch if present
    React.useEffect(() => {
        if (fetchError) {
            showError(fetchError?.data?.message || "Error loading teams data");
        }
    }, [fetchError]);
    React.useEffect(() => {
        if (teamsData?.data) {
            const initialData = teamsData.data.map((team) => {
                return {
                    id: team._id,
                    name: team.name,
                    shortName: team.shortName,
                    logo: team.logo,
                    // purseRemaining: team.purseRemaining,
                    currentSquadSize: team.currentSquadSize,
                    overseasCount: team.overseasCount,
                    auctionStatus: team.auctionStatus,
                    owner: {
                        id: team.owner?._id,
                        name: team.owner?.name,
                    },
                    // totalSpent: 100000000 - team.purseRemaining,
                };
            });
            setData(initialData);
        }
    }, [teamsData]);
    // Function to show error
    const showError = (message, type = "error") => {
        setError({
            visible: true,
            message,
            type,
        });
    };
    // Function to dismiss error
    const dismissError = () => {
        setError((prev) => ({ ...prev, visible: false }));
    };
    // // Table columns
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
            accessorKey: "logo",
            header: "Logo",
            cell: ({ row }) => (<TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <img src={row.getValue("logo")} alt={row.getValue("name")} className="w-10 h-10 rounded-full"/>
                            </TooltipTrigger>
                            <TooltipContent>
                                <img src={row.getValue("logo")} alt={row.getValue("name")} className="w-20 h-20"/>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>),
        },
        {
            accessorKey: "name",
            header: "Team Name",
            cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
        },
        {
            accessorKey: "shortName",
            header: "Short Name",
            cell: ({ row }) => <div>{row.getValue("shortName")}</div>,
        },
        // {
        //     accessorKey: "purseRemaining",
        //     header: "Purse Remaining",
        //     cell: ({ row }) => {
        //         const amount = parseFloat(row.getValue("purseRemaining"));
        //         // Format as crores (1 crore = 10 million)
        //         const inCrores = (amount / 10000000).toFixed(2);
        //         return <div className="font-medium">₹{inCrores} Cr</div>;
        //     },
        // },
        // {
        //     accessorKey: "totalSpent",
        //     header: "Total Spent",
        //     cell: ({ row }) => {
        //         const amount = parseFloat(row.getValue("totalSpent"));
        //         // Format as crores (1 crore = 10 million)
        //         const inCrores = (amount / 10000000).toFixed(2);
        //         return <div className="font-medium">₹{inCrores} Cr</div>;
        //     },
        // },
        {
            accessorKey: "currentSquadSize",
            header: "Squad Size",
            cell: ({ row }) => <div>{row.getValue("currentSquadSize")}</div>,
        },
        {
            accessorKey: "overseasCount",
            header: "Overseas Players",
            cell: ({ row }) => <div>{row.getValue("overseasCount")}</div>,
        },
        {
            accessorKey: "auctionStatus",
            header: "Status",
            cell: ({ row }) => (<div className={`capitalize ${row.getValue("auctionStatus") === "active" ? "text-green-600" : "text-red-600"}`}>
                        {row.getValue("auctionStatus")}
                    </div>),
        },
        // {
        //     accessorKey: "owner.name",
        //     header: "Owner",
        //     cell: ({ row }) => <div>{row.original.owner.name}</div>,
        // },
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
    const [updateTeams, { isLoading: isSubmitting }] = useAddTeamsToAuctionMutation();
    const handleUpdateTeams = async () => {
        const selectedTeams = Object.keys(rowSelection).map((index) => data[Number(index)]);
        if (selectedTeams.length === 0) {
            showError("No teams selected!", "warning");
            toast.error("No teams selected!");
            return;
        }
        const teamsToUpdate = selectedTeams.map((team) => team.id);
        try {
            const res = await updateTeams({
                id,
                teams: teamsToUpdate,
                status: "active",
            }).unwrap();
            if (res.success) {
                dispatch(setSelectedAuction(res.auction));
                setRowSelection({});
                refetch();
                toast.success("Teams updated successfully!");
                // Clear any existing errors
                dismissError();
            }
            else {
                // Handle non-exception failure
                showError(res.message || "Failed to update teams");
                toast.error("Failed to update teams");
            }
        }
        catch (err) {
            console.error("Error occurred while updating teams: ", err);
            showError(err?.data?.message || "An unexpected error occurred");
            toast.error("Failed to add teams!");
        }
    };
    if (dataLoading)
        return <LoadSpinner />;
    if (!data || data.length === 0) {
        return (<EmptyState icon={Users} title="No teams to add" hint={fetchError?.data?.message || "Every team is already in this auction, or busy in another one that hasn't finished."}/>);
    }
    return (<div className="w-full">
            <AnimatePresence>
                {error.visible && (<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="mb-4 mt-3 sticky top-0 z-10">
                        <Alert variant={error.type === "error" ? "destructive" : "default"} className={`border-l-4 ${error.type === "error"
                ? "border-red-500 bg-red-50"
                : error.type === "warning"
                    ? "border-yellow-500 bg-yellow-50"
                    : "border-blue-500 bg-slate-50"} shadow-md flex items-start justify-between`}>
                            <div className="flex items-start gap-2">
                                <AlertTitle className={`flex items-center gap-2 ${error.type === "error"
                ? "text-red-700"
                : error.type === "warning"
                    ? "text-yellow-700"
                    : "text-navy-800"}`}>
                                    <AlertTriangle className="w-5 h-5"/>
                                    {error.type === "error" ? "Error" : error.type === "warning" ? "Warning" : "Info"}:
                                </AlertTitle>
                                <AlertDescription className={`${error.type === "error"
                ? "text-red-600"
                : error.type === "warning"
                    ? "text-yellow-600"
                    : "text-navy-600"}`}>
                                    {error.message}
                                </AlertDescription>
                            </div>
                            <Button variant="ghost" size="sm" onClick={dismissError} className="h-6 w-6 p-0 rounded-full">
                                <X className="h-4 w-4"/>
                                <span className="sr-only">Dismiss</span>
                            </Button>
                        </Alert>
                    </motion.div>)}
            </AnimatePresence>

            <div className="flex items-center py-4 gap-2">
                <Input placeholder="Search teams..." value={table.getState().globalFilter ?? ""} onChange={(event) => table.setGlobalFilter(event.target.value)} className="max-w-sm"/>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="ml-auto">
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
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (<TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (<TableHead key={header.id}>
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
        }} className="h-8 w-[70px]">
                            {[5, 10, 20, 30, 50].map((pageSize) => (<option key={pageSize} value={pageSize}>
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
                <Button variant="default" size="lg" onClick={handleUpdateTeams} disabled={isSubmitting || Object.keys(rowSelection).length === 0} className="bg-navy-700 text-white hover:bg-navy-800 transition-colors">
                    {isSubmitting ? (<span className="flex items-center gap-2">
                            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                            Updating...
                        </span>) : ("Update Selected Teams")}
                </Button>
            </div>
        </div>);
}
export default TeamsDataTable;
