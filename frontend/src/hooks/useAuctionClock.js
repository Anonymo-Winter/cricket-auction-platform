import { useEffect, useRef, useState } from "react";

// A countdown that tracks the SERVER's clock. `serverTime` arrives with every timer sync; the gap between it and the
// local clock is remembered, so a wrong clock on this device doesn't change the countdown. A paused or
// not-yet-running auction shows `frozenSeconds` instead of counting down.
export function useAuctionClock({ endTime, serverTime, running, frozenSeconds = 0 }) {
    const offset = useRef(0);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (serverTime) offset.current = serverTime - Date.now();
    }, [serverTime, endTime]);

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 100);
        return () => clearInterval(id);
    }, []);

    if (!running || !endTime) {
        return { msLeft: frozenSeconds * 1000, seconds: Math.max(0, Math.ceil(frozenSeconds)) };
    }
    const msLeft = Math.max(0, new Date(endTime).getTime() - (now + offset.current));
    return { msLeft, seconds: Math.ceil(msLeft / 1000) };
}
