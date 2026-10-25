// Turns an RTK Query error into one consistent message, whatever the cause.
//   "not-found"  the thing doesn't exist (bad or old link, deleted record) - 404, or 400 for a malformed id
//   "network"    the server couldn't be reached at all
//   "forbidden"  signed out or not allowed (401 / 403)
//   "server"     anything else (5xx, unexpected response)
export function describeError(error, what = "page") {
    const status = error?.status;
    const noun = what.charAt(0).toUpperCase() + what.slice(1);

    if (status === "FETCH_ERROR" || status === "TIMEOUT_ERROR") {
        return {
            kind: "network",
            title: "Can't reach the server",
            hint: "Check your internet connection and try again. If the problem continues, the server may be down.",
            retry: true,
        };
    }
    if (status === 401 || status === 403) {
        return {
            kind: "forbidden",
            title: status === 401 ? "Please sign in again" : "You don't have access to this",
            hint: status === 401 ? "Your session has ended. Sign in to continue." : "Your account isn't allowed to open this page.",
            retry: false,
        };
    }
    if (status === 404 || status === 400) {
        return {
            kind: "not-found",
            title: `${noun} not found`,
            hint: "It may have been deleted, or the link is wrong.",
            retry: false,
        };
    }
    return {
        kind: "server",
        title: "Something went wrong",
        hint: "We couldn't load this right now. Try again in a moment.",
        retry: true,
    };
}

// The text to show for a failed action (sign in, save, register...): the server's own message when it sent one,
// a clear "can't reach the server" when there was no response at all, otherwise the fallback.
export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
    if (error?.status === "FETCH_ERROR" || error?.status === "TIMEOUT_ERROR") {
        return "Can't reach the server. Check your connection and try again.";
    }
    return error?.data?.message || fallback;
}
