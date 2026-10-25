export const ROLES = {
    USER: "user",
    AUCTIONEER: "auctioneer",
    ADMIN: "admin",
};

const ROLE_HOME = {
    [ROLES.ADMIN]: "/dashboard",
    [ROLES.AUCTIONEER]: "/assignedAuctions",
    [ROLES.USER]: "/auctions",
};

const ROLE_LABEL = {
    [ROLES.ADMIN]: "Admin",
    [ROLES.AUCTIONEER]: "Auctioneer",
    [ROLES.USER]: "Team Owner",
};

// Where a user lands right after signing in
export const roleHome = (role) => ROLE_HOME[role] || "/auctions";

export const roleLabel = (role) => ROLE_LABEL[role] || "Guest";

// Sections only some roles may open (mirrors the route guards in App.jsx)
const RESTRICTED = [
    { prefix: "/dashboard", roles: [ROLES.ADMIN] },
    { prefix: "/assignedAuctions", roles: [ROLES.AUCTIONEER, ROLES.ADMIN] },
    { prefix: "/register", roles: [ROLES.USER] },
];

const canOpen = (role, path) => RESTRICTED.every((r) => !path.startsWith(r.prefix) || r.roles.includes(role));

// Where to send someone who has just signed in. Back to the page they were trying to reach, but only if their role
// may open it: logging out of the admin dashboard and signing in as a team owner must not end on "Access denied".
export const postLoginPath = (role, from) => {
    const wanted = typeof from === "string" ? from : "";
    const usable = wanted && !["/login", "/signup", "/unauthorized"].some((p) => wanted.startsWith(p)) && canOpen(role, wanted);
    return usable ? wanted : roleHome(role);
};
