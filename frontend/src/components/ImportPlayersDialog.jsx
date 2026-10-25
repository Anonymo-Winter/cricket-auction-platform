import { useRef, useState } from "react";
import { FileUp, Download, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useImportPlayersMutation } from "../api/playerApi.js";
import { parsePlayerCsv, playerCsvTemplate, downloadText, PLAYER_CSV_REQUIRED } from "../lib/csv.js";

const STATUS_STYLE = {
    valid: "text-green-700",
    duplicate: "text-amber-700",
    invalid: "text-red-700",
};

// Admin: import players from a CSV file. The file is checked by the server first (a dry run) and nothing is saved
// until the admin confirms; rows that are invalid or already exist are skipped with the reason shown.
export default function ImportPlayersDialog({ children }) {
    const [open, setOpen] = useState(false);
    const [fileName, setFileName] = useState("");
    const [rows, setRows] = useState([]);
    const [problem, setProblem] = useState("");
    const [preview, setPreview] = useState(null);
    const inputRef = useRef(null);
    const [importPlayers, { isLoading }] = useImportPlayersMutation();

    const reset = () => {
        setFileName("");
        setRows([]);
        setProblem("");
        setPreview(null);
        if (inputRef.current) inputRef.current.value = "";
    };

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        reset();
        setFileName(file.name);

        const { rows: parsed, missing } = parsePlayerCsv(await file.text());
        if (missing.length > 0) {
            setProblem(`This file is missing required column(s): ${missing.join(", ")}. Download the template to see the format.`);
            return;
        }
        if (parsed.length === 0) {
            setProblem("The file has a header but no players.");
            return;
        }
        setRows(parsed);
        try {
            setPreview(await importPlayers({ rows: parsed, dryRun: true }).unwrap());
        } catch (error) {
            setProblem(error?.data?.message || "Could not check the file. Please try again.");
        }
    };

    const confirmImport = async () => {
        try {
            const res = await importPlayers({ rows, dryRun: false }).unwrap();
            toast.success(`Imported ${res.created} player${res.created === 1 ? "" : "s"}`);
            setOpen(false);
            reset();
        } catch (error) {
            toast.error(error?.data?.message || "Import failed");
        }
    };

    const skipped = (preview?.rows || []).filter((r) => r.status !== "valid");

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) reset();
            }}
        >
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Import players from CSV</DialogTitle>
                    <DialogDescription>
                        Required columns: {PLAYER_CSV_REQUIRED.join(", ")}. Prices can be plain numbers or written like
                        <code className="mx-1">2cr</code> or <code className="mx-1">50L</code>. Up to 500 players at a time.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-700">
                        <FileUp className="h-4 w-4" />
                        Choose CSV file
                        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
                    </label>
                    <Button type="button" variant="outline" onClick={() => downloadText("players-template.csv", playerCsvTemplate())}>
                        <Download className="mr-2 h-4 w-4" />
                        Download template
                    </Button>
                    {fileName && <span className="text-sm text-gray-600">{fileName}</span>}
                </div>

                {problem && (
                    <p className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {problem}
                    </p>
                )}

                {isLoading && !preview && (
                    <p className="flex items-center gap-2 text-sm text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" /> Checking the file…
                    </p>
                )}

                {preview && (
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-4 text-sm">
                            <span className="flex items-center gap-1 text-green-700">
                                <CheckCircle2 className="h-4 w-4" /> {preview.summary.valid} ready to import
                            </span>
                            <span className="text-amber-700">{preview.summary.duplicate} already exist</span>
                            <span className="text-red-700">{preview.summary.invalid} have problems</span>
                        </div>
                        {skipped.length > 0 && (
                            <div className="max-h-56 overflow-auto rounded-md border text-sm">
                                <table className="w-full">
                                    <thead className="sticky top-0 bg-gray-100 text-left">
                                        <tr>
                                            <th className="px-3 py-2">Row</th>
                                            <th className="px-3 py-2">Player</th>
                                            <th className="px-3 py-2">Why it will be skipped</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {skipped.slice(0, 100).map((r) => (
                                            <tr key={r.row} className="border-t align-top">
                                                <td className="px-3 py-2">{r.row + 1}</td>
                                                <td className="px-3 py-2">{r.name || "—"}</td>
                                                <td className={`px-3 py-2 ${STATUS_STYLE[r.status]}`}>{r.errors.join("; ")}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <p className="text-xs text-gray-500">Nothing has been saved yet. Skipped rows are left out; fix them in the file and import again if you want them.</p>
                    </div>
                )}

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        disabled={!preview || preview.summary.valid === 0 || isLoading}
                        onClick={confirmImport}
                        className="bg-navy-800 text-white hover:bg-navy-700"
                    >
                        {isLoading && preview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Import {preview?.summary.valid ?? 0} player{preview?.summary.valid === 1 ? "" : "s"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
