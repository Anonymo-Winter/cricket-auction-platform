import Player from "../models/player.models.js";

export const IMPORT_LIMIT = 500;

// Columns of the CSV template, in order. Required: name, dateOfBirth, nationality, role, battingStyle, iplDebut, basePrice.
export const IMPORT_COLUMNS = [
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

const ROLES = ["batsman", "bowler", "all-rounder", "wicket-keeper", "wicket-keeper-batsman"];
const ROLE_ALIASES = {
    batter: "batsman",
    allrounder: "all-rounder",
    wk: "wicket-keeper",
    keeper: "wicket-keeper",
    "wicketkeeper-batsman": "wicket-keeper-batsman",
    "wicket-keeper-batter": "wicket-keeper-batsman",
    "wk-batsman": "wicket-keeper-batsman",
    "wk-batter": "wicket-keeper-batsman",
};
const BATTING = ["right-handed", "left-handed"];
const BOWLING = Player.schema.path("bowlingStyle").enumValues;

const slug = (v) => String(v ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");

const pick = (value, allowed, aliases = {}) => {
    const key = slug(value);
    const resolved = aliases[key] || key;
    return allowed.includes(resolved) ? resolved : null;
};

// "20000000", "2cr", "2 crore", "20L", "20 lakh"
export const parsePrice = (value) => {
    const m = /^([\d,.]+)\s*(cr|crore|crores|l|lac|lacs|lakh|lakhs)?$/i.exec(String(value ?? "").trim());
    if (!m) return null;
    const n = Number(m[1].replace(/,/g, ""));
    if (!Number.isFinite(n)) return null;
    const unit = (m[2] || "").toLowerCase();
    if (unit.startsWith("c")) return Math.round(n * 10000000);
    if (unit) return Math.round(n * 100000);
    return Math.round(n);
};

// 1988-11-05, 05/11/1988 or 05-11-1988 (day first)
export const parseDate = (value) => {
    const text = String(value ?? "").trim();
    let y, mo, d;
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
    if (m) [, y, mo, d] = m;
    else if ((m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text))) [, d, mo, y] = m;
    else return null;
    const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
    return date.getUTCFullYear() === Number(y) && date.getUTCMonth() === Number(mo) - 1 && date.getUTCDate() === Number(d)
        ? date
        : null;
};

const dayKey = (date) => new Date(date).toISOString().slice(0, 10);

// Turns one CSV row into a Player document, or a list of problems.
export const buildPlayer = (row) => {
    const errors = [];
    const get = (k) => String(row[k] ?? "").trim();

    const name = get("name");
    if (!name) errors.push("name is required");
    const nationality = get("nationality");
    if (!nationality) errors.push("nationality is required");

    const dateOfBirth = parseDate(row.dateOfBirth);
    if (!dateOfBirth) errors.push("dateOfBirth must look like 1990-04-25 or 25/04/1990");

    const role = pick(row.role, ROLES, ROLE_ALIASES);
    if (!role) errors.push(`role must be one of: ${ROLES.join(", ")}`);

    const battingStyle = pick(row.battingStyle, BATTING, { right: "right-handed", left: "left-handed", rhb: "right-handed", lhb: "left-handed" });
    if (!battingStyle) errors.push(`battingStyle must be one of: ${BATTING.join(", ")}`);

    let bowlingStyle = "none";
    if (get("bowlingStyle")) {
        bowlingStyle = pick(row.bowlingStyle, BOWLING);
        if (!bowlingStyle) errors.push(`bowlingStyle must be one of: ${BOWLING.join(", ")}`);
    }

    const iplDebut = Number(get("iplDebut"));
    const thisYear = new Date().getFullYear();
    if (!Number.isInteger(iplDebut) || iplDebut < 2008 || iplDebut > thisYear) {
        errors.push(`iplDebut must be a year between 2008 and ${thisYear}`);
    }

    let matches = 0;
    if (get("matches")) {
        matches = Number(get("matches"));
        if (!Number.isInteger(matches) || matches < 0) errors.push("matches must be a whole number");
    }

    const basePrice = parsePrice(row.basePrice);
    if (!basePrice || basePrice <= 0) errors.push("basePrice must be a positive amount, e.g. 20000000, 2cr or 20L");

    let isUncapped = true;
    if (get("isUncapped")) {
        const v = get("isUncapped").toLowerCase();
        if (["true", "yes", "y", "1"].includes(v)) isUncapped = true;
        else if (["false", "no", "n", "0"].includes(v)) isUncapped = false;
        else errors.push("isUncapped must be yes or no");
    }

    if (errors.length) return { errors };

    const doc = { name, dateOfBirth, nationality, role, battingStyle, bowlingStyle, iplDebut, matches, basePrice, isUncapped };
    if (get("image")) doc.image = get("image");

    const invalid = new Player(doc).validateSync();
    if (invalid) return { errors: Object.values(invalid.errors).map((e) => e.message) };
    return { doc };
};

// Checks every row (and flags players that already exist or repeat inside the file).
// Returns one entry per row, in order: { row, name, status: "valid" | "duplicate" | "invalid", errors?, doc? }.
export const analyseRows = async (rows) => {
    const built = rows.map((row, i) => ({ row: i + 1, name: String(row?.name ?? "").trim(), ...buildPlayer(row || {}) }));

    const names = [...new Set(built.filter((b) => b.doc).map((b) => b.doc.name))];
    const existing = names.length ? await Player.find({ name: { $in: names } }).select("name dateOfBirth").lean() : [];
    const taken = new Set(existing.map((p) => `${p.name.toLowerCase()}|${dayKey(p.dateOfBirth)}`));

    return built.map((b) => {
        if (b.errors) return { row: b.row, name: b.name, status: "invalid", errors: b.errors };
        const key = `${b.doc.name.toLowerCase()}|${dayKey(b.doc.dateOfBirth)}`;
        if (taken.has(key)) {
            return { row: b.row, name: b.name, status: "duplicate", errors: ["A player with this name and date of birth already exists"] };
        }
        taken.add(key); // a repeat later in the same file is a duplicate too
        return { row: b.row, name: b.name, status: "valid", doc: b.doc };
    });
};
