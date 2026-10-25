import * as React from "react";
import { Button } from "./ui/button.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table.tsx";
import { useGetAuditLogQuery } from "../api/userApi.js";
import LoadSpinner from "./LoadSpinner.jsx";
const LABELS = {
    "admin.seeded": "First admin created",
    "user.signup": "Team owner signed up",
    "invite.auctioneer.created": "Auctioneer invited",
    "invite.owner.created": "Team owner invited",
    "invite.accepted": "Invite accepted",
    "password.reset-link.created": "Password reset link created",
    "password.reset": "Password reset",
    "user.status.changed": "Account status changed",
    "user.role.changed": "Role changed",
    "user.deleted": "Account deleted",
    "auctioneer.assigned": "Auctioneer assigned to auction",
    "auctioneer.unassigned": "Auctioneer removed from auction",
};
const describeMeta = (meta = {}) => Object.entries(meta)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
const LIMIT = 25;
export default function AuditLogTab() {
    const [page, setPage] = React.useState(1);
    const { data, isLoading, isFetching, isError } = useGetAuditLogQuery({ page, limit: LIMIT }, { refetchOnMountOrArgChange: true });
    if (isLoading)
        return <LoadSpinner />;
    if (isError)
        return <p className="py-8 text-center text-red-600">Couldn&apos;t load the activity log.</p>;
    const entries = data?.entries ?? [];
    const totalPages = Math.max(Math.ceil((data?.total ?? 0) / LIMIT), 1);
    return (<div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Who created, changed or removed accounts. Newest first.
            </p>
            {entries.length === 0 ? (<p className="py-8 text-center text-gray-600">Nothing has been recorded yet.</p>) : (<div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-gray-700">
                            <TableRow className="hover:bg-navy-900">
                                {["When", "Who", "What", "Account / target", "Details"].map((h) => (<TableHead key={h} className="text-gray-100">
                                        {h}
                                    </TableHead>))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.map((e) => (<TableRow key={e._id}>
                                    <TableCell className="whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</TableCell>
                                    <TableCell>
                                        {e.actorName || "—"}
                                        {e.actorRole ? <span className="ml-1 text-xs text-muted-foreground">({e.actorRole})</span> : null}
                                    </TableCell>
                                    <TableCell>{LABELS[e.action] || e.action}</TableCell>
                                    <TableCell>{e.targetLabel || e.targetId || "—"}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{describeMeta(e.meta)}</TableCell>
                                </TableRow>))}
                        </TableBody>
                    </Table>
                </div>)}
            <div className="flex items-center justify-end gap-2">
                <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page <= 1 || isFetching} onClick={() => setPage((p) => p - 1)}>
                    Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages || isFetching} onClick={() => setPage((p) => p + 1)}>
                    Next
                </Button>
            </div>
        </div>);
}
