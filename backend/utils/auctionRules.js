// "2026-10-22T18:00" means a different moment in every timezone. Accept only exact instants: a Date, or an ISO string
// ending in Z or a UTC offset such as +05:30.
export const hasTimezone = (value) =>
    value instanceof Date || typeof value === "number" || (typeof value === "string" && /(Z|[+-]\d{2}:?\d{2})$/i.test(value.trim()));

export const DEFAULT_SETTINGS = {
    minBidIncrement: 100000,
    bidTimeLimit: 30,
    maxPursePerTeam: 100000000,
    maxOverseasPlayers: 8,
    maxSquadSize: 25,
    minSquadSize: 18,
};

// Merges `input` over `base` (defaults, or the auction's current settings), coerces to numbers and checks the
// result makes sense. Returns { settings } or { error }.
export const resolveSettings = (input = {}, base = DEFAULT_SETTINGS) => {
    const settings = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
        const raw = input[key] === undefined || input[key] === "" || input[key] === null ? base[key] : input[key];
        const value = Number(raw);
        if (!Number.isFinite(value)) return { error: `${key} must be a number` };
        settings[key] = value;
    }

    const whole = ["minBidIncrement", "bidTimeLimit", "maxPursePerTeam", "maxOverseasPlayers", "maxSquadSize", "minSquadSize"];
    for (const key of whole) {
        if (!Number.isInteger(settings[key])) return { error: `${key} must be a whole number` };
    }
    if (settings.minBidIncrement <= 0) return { error: "Minimum bid increment must be greater than 0" };
    if (settings.bidTimeLimit < 5 || settings.bidTimeLimit > 300) {
        return { error: "Bid time limit must be between 5 and 300 seconds" };
    }
    if (settings.maxPursePerTeam < settings.minBidIncrement) {
        return { error: "Max purse per team must be at least the minimum bid increment" };
    }
    if (settings.maxOverseasPlayers < 0) return { error: "Max overseas players can't be negative" };
    if (settings.minSquadSize < 1) return { error: "Min squad size must be at least 1" };
    if (settings.maxSquadSize < settings.minSquadSize) {
        return { error: "Max squad size can't be smaller than the min squad size" };
    }
    return { settings };
};
