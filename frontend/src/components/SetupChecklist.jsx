import { format } from "date-fns";
import { CheckCircle2, Circle, AlertTriangle, CalendarClock } from "lucide-react";

// What an admin should have in place before a scheduled auction opens. Auctions open by themselves at their
// start time whether or not these are done, so this says what is missing rather than blocking anything.
export default function SetupChecklist({ auction }) {
    if (!auction) return null;

    if (auction.status === "cancelled") {
        return (
            <div className="rounded-lg border border-gray-300 bg-gray-50 p-4 text-sm text-gray-700">
                This auction is cancelled. Set its status back to <strong>Scheduled</strong> (with a future start time) in
                Details to run it.
            </div>
        );
    }
    if (auction.status !== "scheduled") return null;

    const teams = auction.teams?.length || 0;
    const players = auction.players?.length || 0;
    const minSquad = auction.settings?.minSquadSize || 1;
    const needed = teams * minSquad;
    const setsUsed = new Set((auction.players || []).map((p) => p.set)).size;
    const start = new Date(auction.startTime);
    const startsInFuture = start.getTime() > Date.now();

    const items = [
        {
            required: true,
            ok: players > 0,
            label: `Players added (${players})`,
            hint: players > 0 ? "" : "Use the Add Players tab, or import a CSV on the Players page first.",
        },
        {
            required: true,
            ok: teams >= 2,
            label: `At least 2 teams (${teams})`,
            hint: teams >= 2 ? "" : "Team owners register themselves, or add teams in the Add Teams tab.",
        },
        {
            required: true,
            ok: teams > 0 && players >= needed,
            label: "Enough players for every team to reach the minimum squad",
            hint:
                teams > 0 && players >= needed
                    ? `${teams} teams × ${minSquad} = ${needed} needed, ${players} added`
                    : `${teams} teams × ${minSquad} = ${needed} needed, but only ${players} added`,
        },
        {
            required: true,
            ok: startsInFuture,
            label: `Start time is in the future (${format(start, "d MMM yyyy, HH:mm")})`,
            hint: startsInFuture ? "" : "The start time has passed. Change it in Details.",
        },
        {
            required: false,
            ok: setsUsed > 1,
            label: "Players arranged into sets",
            hint: setsUsed > 1 ? "" : "Optional: every player is still in one set, so they will come up in the order added.",
        },
        {
            required: false,
            ok: !!auction.auctioneer,
            label: auction.auctioneer ? "Auctioneer assigned" : "No auctioneer assigned",
            hint: auction.auctioneer
                ? ""
                : "Optional: it runs by itself. Admins can still pause, skip a player or undo a bid.",
        },
    ];

    const missing = items.filter((i) => i.required && !i.ok);
    const ready = missing.length === 0;

    return (
        <div className={`rounded-lg border p-4 ${ready ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}`}>
            <div className="flex items-start gap-3">
                {ready ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                ) : (
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                )}
                <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                        {ready ? "Ready to go" : `${missing.length} thing${missing.length === 1 ? "" : "s"} to sort out before it opens`}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-700">
                        <CalendarClock className="h-4 w-4" />
                        Opens automatically at {format(start, "d MMM yyyy, HH:mm")}
                        {ready ? "." : ", ready or not."}
                    </p>
                    <ul className="mt-3 space-y-1.5">
                        {items.map((item) => (
                            <li key={item.label} className="flex items-start gap-2 text-sm">
                                {item.ok ? (
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                                ) : (
                                    <Circle className={`mt-0.5 h-4 w-4 shrink-0 ${item.required ? "text-amber-600" : "text-gray-400"}`} />
                                )}
                                <span>
                                    <span className={item.ok ? "text-gray-800" : "font-medium text-gray-900"}>{item.label}</span>
                                    {!item.required && !item.ok && <span className="ml-1 text-xs text-gray-500">(optional)</span>}
                                    {item.hint && <span className="block text-xs text-gray-600">{item.hint}</span>}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
