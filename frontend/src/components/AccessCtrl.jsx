import EmptyState from "./EmptyState";
import * as React from "react";
import { flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, useReactTable, } from "@tanstack/react-table";
import { Button } from "./ui/button.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Input } from "./ui/input.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table.tsx";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "./ui/dropdown-menu.tsx";
import { MoreHorizontal, Trash2, UserCog, Shield, User, Activity, Users } from "lucide-react";
import { toast } from "sonner";
import LoadSpinner from "./LoadSpinner.jsx";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "./ui/dialog.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select.tsx";
// Import RTK Query hooks
import { useGetUsersQuery, useDeleteUserMutation, useGetAuctioneersQuery, useDeleteAuctioneerMutation, useAssignAuctioneersMutation, useUpdateUserRoleMutation, useDeassignAuctioneersMutation, useCreateResetLinkMutation, useSetUserStatusMutation, } from "../api/userApi.js";
import { useGetAllAvailableAuctionsQuery } from "../api/auctionApi.js";
import InviteDialog from "./InviteDialog.jsx";
import ShareLinkDialog from "./ShareLinkDialog.jsx";
import AuditLogTab from "./AuditLogTab.jsx";
function AdminAccessControl() {
    const [activeTab, setActiveTab] = React.useState("users");
    const [selectedAuctionId, setSelectedAuctionId] = React.useState("");
    const [assignDialogOpen, setAssignDialogOpen] = React.useState(false);
    const [selectedAuctioneer, setSelectedAuctioneer] = React.useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
    const [itemToDelete, setItemToDelete] = React.useState({ id: "", type: "" });
    const [roleDialogOpen, setRoleDialogOpen] = React.useState(false);
    const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState({ id: "", name: "", role: "" });
    const [newRole, setNewRole] = React.useState("");
    const [assignedAuctions, setAssignedAuctions] = React.useState([]);
    const toggleBodyPointerEvents = () => {
        document.body.style.pointerEvents = "auto";
    };
    React.useEffect(() => {
        return () => {
            toggleBodyPointerEvents();
        };
    });
    // RTK Query hooks
    const { data: users, isLoading: usersLoading, refetch: refetchUsers, } = useGetUsersQuery(undefined, {
        refetchOnMountOrArgChange: true,
    });
    const { data: auctioneers, isLoading: auctioneersLoading, refetch: refetchAuctioneers, } = useGetAuctioneersQuery(undefined, {
        refetchOnMountOrArgChange: true,
    });
    const { data: auctions, refetch: refetchAvailableAuctions, } = useGetAllAvailableAuctionsQuery(undefined, {
        refetchOnMountOrArgChange: true,
    });
    const [deleteUser, { isLoading: isDeletingUser }] = useDeleteUserMutation();
    const [deleteAuctioneer, { isLoading: isDeletingAuctioneer }] = useDeleteAuctioneerMutation();
    const [assignAuctioneerToAuction, { isLoading: isAssigning }] = useAssignAuctioneersMutation();
    const [deassignAuctioneers] = useDeassignAuctioneersMutation();
    const [updateUserRole, { isLoading: isUpdatingRole }] = useUpdateUserRoleMutation();
    const [createResetLink] = useCreateResetLinkMutation();
    const [setUserStatus] = useSetUserStatusMutation();
    const [shareLink, setShareLink] = React.useState(null);
    // State for table data
    const [userData, setUserData] = React.useState([]);
    const [auctioneerData, setAuctioneerData] = React.useState([]);
    // Table state
    const [userSorting, setUserSorting] = React.useState([]);
    const [userColumnVisibility, setUserColumnVisibility] = React.useState({});
    const [userRowSelection, setUserRowSelection] = React.useState({});
    const [auctioneerSorting, setAuctioneerSorting] = React.useState([]);
    const [auctioneerColumnVisibility, setAuctioneerColumnVisibility] = React.useState({});
    const [auctioneerRowSelection, setAuctioneerRowSelection] = React.useState({});
    // Format user data when it's loaded
    React.useEffect(() => {
        if (users?.users) {
            const formattedUsers = users.users.map((user) => ({
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: new Date(user.createdAt).toLocaleDateString(),
                avatar: user.avatar || "/placeholder-avatar.png",
                status: user.status || "active",
            }));
            setUserData(formattedUsers);
        }
    }, [users]);
    React.useEffect(() => {
        if (auctioneers) {
            const formattedAuctioneers = auctioneers.map((auctioneer) => ({
                id: auctioneer._id,
                name: auctioneer.name,
                email: auctioneer.email,
                specialty: auctioneer.specialty || "General",
                experience: auctioneer.experience || 0,
                auctionsCompleted: auctioneer.auctionsCompleted || 0,
                currentlyAssigned: auctioneer.assignedAuctions.length > 0,
                assignedAuctions: auctioneer.assignedAuctions.map((a) => a.auctionId) || [],
                avatar: auctioneer.avatar || "/placeholder-avatar.png",
                status: auctioneer.status || "active",
            }));
            setAuctioneerData(formattedAuctioneers);
        }
    }, [auctioneers]);
    const navigate = useNavigate();
    const viewUser = () => {
        navigate("/dashboard");
    };
    // User table columns
    const userColumns = React.useMemo(() => [
        {
            id: "SINO",
            header: () => {
                return <div className="text-center">#</div>;
            },
            cell: ({ row }) => <div className="text-center">{row.index + 1}</div>,
            enableSorting: false,
            enableHiding: false,
        },
        // {
        //     accessorKey: "avatar",
        //     header: "Avatar",
        //     cell: ({ row }) => (
        //         <TooltipProvider>
        //             <Tooltip>
        //                 <TooltipTrigger>
        //                     <img
        //                         src={row.getValue("avatar")}
        //                         alt={row.getValue("name")}
        //                         className="w-10 h-10 rounded-full"
        //                     />
        //                 </TooltipTrigger>
        //                 <TooltipContent>
        //                     <img src={row.getValue("avatar")} alt={row.getValue("name")} className="w-20 h-20" />
        //                 </TooltipContent>
        //             </Tooltip>
        //         </TooltipProvider>
        //     ),
        // },
        {
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>,
        },
        {
            accessorKey: "email",
            header: "Email",
            cell: ({ row }) => <div>{row.getValue("email")}</div>,
        },
        {
            accessorKey: "role",
            header: "Role",
            cell: ({ row }) => (<div className="flex items-center gap-1">
                        {row.getValue("role") === "admin" ? (<Shield className="w-4 h-4 text-red-500"/>) : row.getValue("role") === "auctioneer" ? (<UserCog className="w-4 h-4 text-blue-500"/>) : (<User className="w-4 h-4 text-gray-500"/>)}
                        <span className="capitalize">{row.getValue("role")}</span>
                    </div>),
        },
        {
            accessorKey: "createdAt",
            header: "Joined",
            cell: ({ row }) => <div>{row.getValue("createdAt")}</div>,
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => (<div className={`capitalize px-2 py-1 rounded-full text-xs font-medium inline-block
                        ${row.getValue("status") === "active"
                    ? "bg-green-100 text-green-800"
                    : row.getValue("status") === "suspended"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"}`}>
                        {row.getValue("status")}
                    </div>),
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const user = row.original;
                return (<DropdownMenu onOpenChange={() => {
                        toggleBodyPointerEvents();
                    }}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => viewUser(user.id)}>View details</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openChangeRoleDialog(user)}>
                                    Change role
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleResetLink(user.id, user.name)}>
                                    Create password reset link
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleStatus(user.id, user.name, user.status)}>
                                    {user.status === "active" ? "Deactivate account" : "Reactivate account"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => openDeleteDialog(user.id, "user")}>
                                    Delete user
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>);
            },
        },
    // Handlers below only call stable mutation triggers and refetch functions
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], []);
    // Auctioneer table columns
    const auctioneerColumns = React.useMemo(() => [
        {
            id: "SINO",
            header: "#",
            cell: ({ row }) => <div>{row.index + 1}</div>,
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "avatar",
            header: "",
            cell: ({ row }) => (<Avatar className="h-9 w-9">
                        <AvatarImage src={row.getValue("avatar")} alt={row.getValue("name")}/>
                        <AvatarFallback className="bg-navy-900 text-xs font-semibold text-gold-300">
                            {String(row.getValue("name") || "?").trim().charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>),
        },
        {
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>,
        },
        {
            accessorKey: "email",
            header: "Email",
            cell: ({ row }) => <div>{row.getValue("email")}</div>,
        },
        {
            accessorKey: "specialty",
            header: "Specialty",
            cell: ({ row }) => <div className="capitalize">{row.getValue("specialty")}</div>,
        },
        {
            accessorKey: "experience",
            header: "Experience (years)",
            cell: ({ row }) => <div>{row.getValue("experience")}</div>,
        },
        {
            accessorKey: "auctionsCompleted",
            header: "Auctions Completed",
            cell: ({ row }) => <div>{row.getValue("auctionsCompleted")}</div>,
        },
        {
            accessorKey: "currentlyAssigned",
            header: "Assigned",
            cell: ({ row }) => (<div className={`capitalize px-2 py-1 rounded-full text-xs font-medium inline-block
                        ${row.getValue("currentlyAssigned")
                    ? "bg-gold-300/30 text-navy-800"
                    : "bg-gray-100 text-gray-800"}`}>
                        {row.getValue("currentlyAssigned") ? "Yes" : "No"}
                    </div>),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => (<div className={`capitalize px-2 py-1 rounded-full text-xs font-medium inline-block ${row.getValue("status") === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {row.getValue("status")}
                    </div>),
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const auctioneer = row.original;
                return (<DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => {
                        viewAuctioneerDetails(auctioneer);
                    }}>
                                    View details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                        refetchAvailableAuctions();
                        openAssignDialog(auctioneer.id);
                    }}>
                                    Assign to auction
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleResetLink(auctioneer.id, auctioneer.name)}>
                                    Create password reset link
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleStatus(auctioneer.id, auctioneer.name, auctioneer.status)}>
                                    {auctioneer.status === "active" ? "Deactivate account" : "Reactivate account"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => openDeleteDialog(auctioneer.id, "auctioneer")}>
                                    Delete auctioneer
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>);
            },
        },
    // Handlers below only call stable mutation triggers and refetch functions
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], []);
    // React Table instance for users
    const userTable = useReactTable({
        data: userData,
        columns: userColumns,
        onSortingChange: setUserSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setUserColumnVisibility,
        onRowSelectionChange: setUserRowSelection,
        state: {
            sorting: userSorting,
            columnVisibility: userColumnVisibility,
            rowSelection: userRowSelection,
        },
    });
    // React Table instance for auctioneers
    const auctioneerTable = useReactTable({
        data: auctioneerData,
        columns: auctioneerColumns,
        onSortingChange: setAuctioneerSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setAuctioneerColumnVisibility,
        onRowSelectionChange: setAuctioneerRowSelection,
        state: {
            sorting: auctioneerSorting,
            columnVisibility: auctioneerColumnVisibility,
            rowSelection: auctioneerRowSelection,
        },
    });
    const viewAuctioneerDetails = (auctioneer) => {
        setSelectedUser({
            id: auctioneer.id,
            name: auctioneer.name,
            role: auctioneer.role,
        });
        setViewDialogOpen(true);
        setAssignedAuctions(auctioneer.assignedAuctions);
    };
    const handleDeassignAuctioneer = async (auctionId) => {
        try {
            const res = await deassignAuctioneers({
                auctioneerId: selectedUser.id,
                auctionId,
            }).unwrap();
            setAssignedAuctions(res.assigned);
            toast.success(`${selectedUser.name} is deassigned from auction`);
            refetchUsers();
            setRoleDialogOpen(false);
            refetchAuctioneers();
        }
        catch (error) {
            toast.error(`Failed to update role: ${error.data.message}`);
        }
    };
    const openChangeRoleDialog = (user) => {
        setSelectedUser({
            id: user.id,
            name: user.name,
            role: user.role,
        });
        setNewRole(user.role);
        setRoleDialogOpen(true);
    };
    const handleChangeRole = async () => {
        if (selectedUser.role === newRole) {
            setRoleDialogOpen(false);
            return;
        }
        try {
            await updateUserRole({
                userId: selectedUser.id,
                role: newRole,
            }).unwrap();
            toast.success(`${selectedUser.name}'s role updated to ${newRole}`);
            refetchUsers();
            refetchAuctioneers();
            setRoleDialogOpen(false);
        }
        catch (error) {
            toast.error(`Failed to update role: ${error.message}`);
        }
    };
    const openAssignDialog = (auctioneerId) => {
        setSelectedAuctioneer(auctioneerId);
        setSelectedAuctionId("");
        setAssignDialogOpen(true);
    };
    const handleAssignAuctioneer = async () => {
        if (!selectedAuctionId) {
            toast.error("Please select an auction");
            return;
        }
        try {
            await assignAuctioneerToAuction({
                auctioneerId: selectedAuctioneer,
                auctionId: selectedAuctionId,
            }).unwrap();
            refetchAuctioneers();
            refetchAvailableAuctions();
            toast.success("Auctioneer assigned successfully");
            setAssignDialogOpen(false);
        }
        catch (error) {
            toast.error(`Failed to assign auctioneer: ${error.data.message}`);
        }
    };
    const handleResetLink = async (id, name) => {
        try {
            const res = await createResetLink({ userId: id }).unwrap();
            setShareLink({
                title: `Password reset link for ${name}`,
                description: "Send this link to them so they can choose a new password.",
                link: res.link,
                expiresAt: res.expiresAt,
            });
        }
        catch (error) {
            toast.error(error?.data?.message || "Failed to create reset link");
        }
    };
    // Deactivating keeps the account, team and bid history but blocks sign-in; it can be undone.
    const handleToggleStatus = async (id, name, current) => {
        const next = current === "active" ? "inactive" : "active";
        try {
            await setUserStatus({ userId: id, status: next }).unwrap();
            toast.success(`${name} ${next === "active" ? "reactivated" : "deactivated"}`);
            refetchUsers();
            refetchAuctioneers();
        }
        catch (error) {
            toast.error(error?.data?.message || "Failed to update account status");
        }
    };
    const openDeleteDialog = (id, type) => {
        setItemToDelete({ id, type });
        setDeleteDialogOpen(true);
    };
    const handleDelete = async () => {
        try {
            if (itemToDelete.type === "user") {
                await deleteUser({ userId: itemToDelete.id }).unwrap();
                toast.success("User deleted successfully");
                refetchUsers();
            }
            else if (itemToDelete.type === "auctioneer") {
                await deleteAuctioneer({ auctioneerId: itemToDelete.id }).unwrap();
                toast.success("Auctioneer deleted successfully");
                refetchAuctioneers();
            }
            setDeleteDialogOpen(false);
        }
        catch (error) {
            toast.error(`Failed to delete: ${error.data.message}`);
        }
    };
    if (usersLoading && auctioneersLoading)
        return <LoadSpinner />;
    return (<div className="w-full bg-white p-2">
            <div className="mb-6 flex items-center justify-between gap-4">
                <h1 className="font-display tracking-tight text-3xl font-bold text-navy-900">Access control</h1>
                <InviteDialog />
            </div>
            <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4 bg-slate-100">
                    <TabsTrigger value="users" className="flex items-center gap-2">
                        <User className="w-4 h-4"/>
                        Users
                    </TabsTrigger>
                    <TabsTrigger value="auctioneers" className="flex items-center gap-2">
                        <UserCog className="w-4 h-4"/>
                        Auctioneers
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="flex items-center gap-2">
                        <Activity className="w-4 h-4"/>
                        Activity
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="space-y-4">
                    {userData.length === 0 ? (<EmptyState icon={Users} title="No users yet" hint="Owners appear here once they sign up or accept an invite."/>) : (<>
                            <div className="flex items-center py-4 gap-2">
                                <Input placeholder="Search users..." value={userTable.getState().globalFilter ?? ""} onChange={(event) => userTable.setGlobalFilter(event.target.value)} className="max-w-sm border border-slate-300"/>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="ml-auto  border border-slate-300">
                                            Columns
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {userTable
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (<DropdownMenuCheckboxItem key={column.id} className="capitalize" checked={column.getIsVisible()} onCheckedChange={(value) => column.toggleVisibility(!!value)}>
                                                    {column.id}
                                                </DropdownMenuCheckboxItem>))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="rounded-md">
                                <Table>
                                    <TableHeader className="bg-navy-900 text-white">
                                        {userTable.getHeaderGroups().map((headerGroup) => (<TableRow key={headerGroup.id} className="hover:bg-navy-900">
                                                {headerGroup.headers.map((header) => (<TableHead key={header.id} className="text-gray-100">
                                                        {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                                                    </TableHead>))}
                                            </TableRow>))}
                                    </TableHeader>
                                    <TableBody className="rounded-xl">
                                        {userTable.getRowModel().rows?.length ? (userTable.getRowModel().rows.map((row) => (<TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="hover:bg-slate-100">
                                                    {row.getVisibleCells().map((cell) => (<TableCell key={cell.id}>
                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                        </TableCell>))}
                                                </TableRow>))) : (<TableRow>
                                                <TableCell colSpan={userColumns.length} className="h-24 text-center">
                                                    <p className="text-sm text-gray-600 mt-1">No matching result</p>
                                                </TableCell>
                                            </TableRow>)}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="flex items-center justify-between px-2 py-4">
                                <div className="text-sm text-muted-foreground">
                                    {userTable.getFilteredSelectedRowModel().rows.length} of{" "}
                                    {userTable.getFilteredRowModel().rows.length} row(s) selected
                                </div>
                                <div className="flex items-center space-x-6 lg:space-x-8">
                                    <div className="flex items-center space-x-2">
                                        <p className="text-sm font-medium">Rows per page</p>
                                        <select value={userTable.getState().pagination.pageSize} onChange={(e) => {
                userTable.setPageSize(Number(e.target.value));
            }} className="h-8 w-[70px]">
                                            {[10, 20, 30, 40, 50].map((pageSize) => (<option key={pageSize} value={pageSize}>
                                                    {pageSize}
                                                </option>))}
                                        </select>
                                    </div>
                                    <div className="flex space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => userTable.previousPage()} disabled={!userTable.getCanPreviousPage()}>
                                            Previous
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => userTable.nextPage()} disabled={!userTable.getCanNextPage()}>
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>)}
                </TabsContent>
                <TabsContent value="auctioneers" className="space-y-4">
                    {auctioneerData.length === 0 ? (<EmptyState icon={Users} title="No auctioneers yet" hint="Invite an auctioneer from the Invite button above."/>) : (<>
                            <div className="flex items-center py-4 gap-2">
                                <Input placeholder="Search auctioneers..." value={auctioneerTable.getState().globalFilter ?? ""} onChange={(event) => auctioneerTable.setGlobalFilter(event.target.value)} className="max-w-sm"/>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="ml-auto">
                                            Columns
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {auctioneerTable
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
                                        {auctioneerTable.getHeaderGroups().map((headerGroup) => (<TableRow key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (<TableHead key={header.id}>
                                                        {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                                                    </TableHead>))}
                                            </TableRow>))}
                                    </TableHeader>
                                    <TableBody>
                                        {auctioneerTable.getRowModel().rows?.length ? (auctioneerTable.getRowModel().rows.map((row) => (<TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                                    {row.getVisibleCells().map((cell) => (<TableCell key={cell.id}>
                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                        </TableCell>))}
                                                </TableRow>))) : (<TableRow>
                                                <TableCell colSpan={auctioneerColumns.length} className="h-24 text-center">
                                                    No results.
                                                </TableCell>
                                            </TableRow>)}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="flex items-center justify-between px-2 py-4">
                                <div className="text-sm text-muted-foreground">
                                    {auctioneerTable.getFilteredSelectedRowModel().rows.length} of{" "}
                                    {auctioneerTable.getFilteredRowModel().rows.length} row(s) selected
                                </div>
                                <div className="flex items-center space-x-6 lg:space-x-8">
                                    <div className="flex items-center space-x-2">
                                        <p className="text-sm font-medium">Rows per page</p>
                                        <select value={auctioneerTable.getState().pagination.pageSize} onChange={(e) => {
                auctioneerTable.setPageSize(Number(e.target.value));
            }} className="h-8 w-[70px]">
                                            {[10, 20, 30, 40, 50].map((pageSize) => (<option key={pageSize} value={pageSize}>
                                                    {pageSize}
                                                </option>))}
                                        </select>
                                    </div>
                                    <div className="flex space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => auctioneerTable.previousPage()} disabled={!auctioneerTable.getCanPreviousPage()}>
                                            Previous
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => auctioneerTable.nextPage()} disabled={!auctioneerTable.getCanNextPage()}>
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>)}
                </TabsContent>
                <TabsContent value="activity" className="space-y-4">
                    <AuditLogTab />
                </TabsContent>
            </Tabs>
            <ShareLinkDialog data={shareLink} onClose={() => setShareLink(null)}/>
            {/* Assign Auctioneer Dialog */}
            <Dialog open={assignDialogOpen} onOpenChange={(open) => setDeleteDialogOpen(open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Auctioneer to Auction</DialogTitle>
                        <DialogDescription>Select an auction to assign this auctioneer to.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {auctions?.data.length > 0 ? (<Select value={selectedAuctionId} onValueChange={setSelectedAuctionId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an auction"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {auctions?.data?.map((auction) => {
                return (<SelectItem key={auction._id} value={auction._id}>
                                                {auction.name} - {new Date(auction.startTime).toLocaleDateString()}
                                            </SelectItem>);
            })}
                                </SelectContent>
                            </Select>) : (<p className="text-center text-gray-500">No Auctions Available</p>)}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAssignAuctioneer} disabled={isAssigning || !selectedAuctionId}>
                            {isAssigning ? "Assigning..." : "Assign"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={(open) => setDeleteDialogOpen(open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this {itemToDelete.type}? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
            setDeleteDialogOpen(false);
        }}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeletingUser || isDeletingAuctioneer} className="flex items-center gap-2">
                            {isDeletingUser || isDeletingAuctioneer ? ("Deleting...") : (<>
                                    <Trash2 className="w-4 h-4"/>
                                    Delete
                                </>)}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Change Role Dialog */}
            <Dialog open={roleDialogOpen} onOpenChange={(open) => setRoleDialogOpen(open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change User Role</DialogTitle>
                        <DialogDescription>Update the role for {selectedUser.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Select value={newRole} onValueChange={setNewRole}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a role"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="auctioneer">Auctioneer</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleChangeRole} disabled={isUpdatingRole}>
                            {isUpdatingRole ? "Updating..." : "Update Role"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={viewDialogOpen} onOpenChange={(open) => setViewDialogOpen(open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Auctioneer</DialogTitle>
                        <DialogDescription>view the auctions assigned for {selectedUser?.name}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {assignedAuctions.length > 0 ? (<Table className="w-full border rounded-lg">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-center  font-semibold">Auction Name</TableHead>
                                        <TableHead className="text-center font-semibold">Deassign</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assignedAuctions.length > 0 ? (assignedAuctions.map((auction) => (<TableRow key={auction.id}>
                                                <TableCell className="text-center">{auction.name}</TableCell>
                                                <TableCell className="text-center">
                                                    <Button variant="destructive" size="sm" onClick={() => handleDeassignAuctioneer(auction._id)}>
                                                        Deassign
                                                    </Button>
                                                </TableCell>
                                            </TableRow>))) : (<TableRow>
                                            <TableCell colSpan={2} className="text-center text-gray-500 py-4">
                                                No auctions assigned
                                            </TableCell>
                                        </TableRow>)}
                                </TableBody>
                            </Table>) : (<div className="text-center text-gray-500 py-4">No auctions assigned</div>)}
                    </div>
                </DialogContent>
            </Dialog>
        </div>);
}
export default AdminAccessControl;
