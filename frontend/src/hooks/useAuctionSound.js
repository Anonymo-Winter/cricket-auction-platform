import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "auctionSound";

const readPreference = () => {
    try {
        return localStorage.getItem(STORAGE_KEY) === "on";
    } catch {
        return false;
    }
};

// Sounds are generated in the browser (no audio files). Browsers only allow sound after a click, so sound starts
// off and the toggle button is what switches it on; the choice is remembered.
export function useAuctionSound() {
    const [enabled, setEnabled] = useState(readPreference);
    const ctxRef = useRef(null);

    const context = useCallback(() => {
        if (!ctxRef.current) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return null;
            ctxRef.current = new Ctx();
        }
        if (ctxRef.current.state === "suspended") ctxRef.current.resume().catch(() => {});
        return ctxRef.current;
    }, []);

    // If sound was left on last time, the first click or key press anywhere wakes the audio engine up
    useEffect(() => {
        if (!enabled) return undefined;
        const wake = () => context();
        window.addEventListener("pointerdown", wake, { once: true });
        window.addEventListener("keydown", wake, { once: true });
        return () => {
            window.removeEventListener("pointerdown", wake);
            window.removeEventListener("keydown", wake);
        };
    }, [enabled, context]);

    const tone = useCallback(
        (ctx, frequency, start, duration, { type = "sine", gain = 0.18 } = {}) => {
            const osc = ctx.createOscillator();
            const amp = ctx.createGain();
            osc.type = type;
            osc.frequency.value = frequency;
            const t0 = ctx.currentTime + start;
            amp.gain.setValueAtTime(0.0001, t0);
            amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
            amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
            osc.connect(amp).connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + duration + 0.05);
        },
        []
    );

    const play = useCallback(
        (name) => {
            if (!enabled) return;
            const ctx = context();
            if (!ctx || ctx.state !== "running") return;
            switch (name) {
                case "once": // going once
                    tone(ctx, 440, 0, 0.35);
                    break;
                case "twice": // going twice
                    tone(ctx, 523, 0, 0.18);
                    tone(ctx, 523, 0.25, 0.18);
                    break;
                case "tick":
                    tone(ctx, 880, 0, 0.09, { type: "square", gain: 0.08 });
                    break;
                case "sold": // rising three-note flourish
                    tone(ctx, 523, 0, 0.18, { type: "triangle" });
                    tone(ctx, 659, 0.16, 0.18, { type: "triangle" });
                    tone(ctx, 784, 0.32, 0.5, { type: "triangle" });
                    break;
                case "unsold": // sinking tone
                    tone(ctx, 330, 0, 0.3, { type: "sawtooth", gain: 0.1 });
                    tone(ctx, 247, 0.28, 0.45, { type: "sawtooth", gain: 0.1 });
                    break;
                default:
            }
        },
        [enabled, context, tone]
    );

    const toggle = useCallback(() => {
        setEnabled((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
            } catch {
                // preference just isn't remembered
            }
            if (next) {
                const ctx = context(); // this click is the user gesture that unlocks audio
                if (ctx) tone(ctx, 660, 0, 0.12, { gain: 0.1 });
            }
            return next;
        });
    }, [context, tone]);

    return { enabled, toggle, play };
}

// Plays the countdown cues: going once at 10s, going twice at 5s, a tick for each of the last 3 seconds.
export function useAuctionCues(sound, { seconds, active, playerKey }) {
    const last = useRef(null);

    useEffect(() => {
        last.current = null; // a new player: start fresh
    }, [playerKey]);

    useEffect(() => {
        if (!active) {
            last.current = null;
            return;
        }
        if (last.current === seconds) return;
        // only react to counting DOWN through a mark (not to the clock jumping up after an extension)
        if (last.current !== null && seconds < last.current) {
            if (seconds === 10) sound.play("once");
            else if (seconds === 5) sound.play("twice");
            else if (seconds >= 1 && seconds <= 3) sound.play("tick");
        }
        last.current = seconds;
    }, [seconds, active, sound]);
}
