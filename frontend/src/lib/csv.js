// Columns of the player import template (same names the server expects)
export const PLAYER_CSV_COLUMNS = [
    "name",
    "dateOfBirth",
    "nationality",
    "role",
    "battingStyle",
    "bowlingStyle",
    "iplDebut",
    "matches",
    "basePrice",
    "isUncapped",
    "image",
];
export const PLAYER_CSV_REQUIRED = ["name", "dateOfBirth", "nationality", "role", "battingStyle", "iplDebut", "basePrice"];

// Minimal CSV reader: quotes, commas and line breaks inside quotes, CRLF, a leading BOM, blank lines.
export const parseCsv = (text) => {
    const records = [];
    let field = "";
    let record = [];
    let inQuotes = false;
    const src = String(text).charCodeAt(0) === 0xfeff ? String(text).slice(1) : String(text); // drop a leading BOM

    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (inQuotes) {
            if (ch === '"' && src[i + 1] === '"') {
                field += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                field += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ",") {
            record.push(field);
            field = "";
        } else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && src[i + 1] === "\n") i++;
            record.push(field);
            field = "";
            if (record.some((cell) => cell.trim() !== "")) records.push(record);
            record = [];
        } else {
            field += ch;
        }
    }
    record.push(field);
    if (record.some((cell) => cell.trim() !== "")) records.push(record);
    return records;
};

const canonical = Object.fromEntries(PLAYER_CSV_COLUMNS.map((c) => [c.toLowerCase().replace(/[\s_-]/g, ""), c]));

// Turns CSV text into { rows, missing }: rows keyed by the canonical column names
export const parsePlayerCsv = (text) => {
    const records = parseCsv(text);
    if (records.length === 0) return { rows: [], missing: PLAYER_CSV_REQUIRED };

    const headers = records[0].map((h) => canonical[h.trim().toLowerCase().replace(/[\s_-]/g, "")] || null);
    const missing = PLAYER_CSV_REQUIRED.filter((c) => !headers.includes(c));

    const rows = records.slice(1).map((cells) => {
        const row = {};
        headers.forEach((key, i) => {
            if (key) row[key] = (cells[i] ?? "").trim();
        });
        return row;
    });
    return { rows, missing };
};

export const playerCsvTemplate = () =>
    [
        PLAYER_CSV_COLUMNS.join(","),
        "Sample Batter,1995-06-15,Indian,batsman,right-handed,none,2019,40,2cr,no,",
        "Sample Spinner,1996-02-20,Indian,all-rounder,left-handed,left-arm-spin,2020,25,50L,yes,",
    ].join("\n");

export const downloadText = (filename, text, type = "text/csv") => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};
