import { useAuctionClock } from "../hooks/useAuctionClock.js";
import { useAuctionSound, useAuctionCues } from "../hooks/useAuctionSound.js";
import GoingBanner from "./GoingBanner.jsx";
import SoundToggle from "./SoundToggle.jsx";
import ResultFlash from "./ResultFlash.jsx";

// Live-page extras: "going once / twice" text and sound under the clock, a sold / unsold pop-up,
// and the sound on/off switch.
export default function LiveCues({ auction, timerData }) {
    const sound = useAuctionSound();
    const running = auction?.status === "active" && !!auction?.currentPlayer;
    const clock = useAuctionClock({
        endTime: auction?.timeRemaining,
        serverTime: timerData?.serverTime,
        running,
        frozenSeconds: auction?.status === "paused" ? auction?.pausedTimeRemaining : 0,
    });
    const playerKey = String(auction?.currentPlayer?._id ?? auction?.currentPlayer ?? "");
    useAuctionCues(sound, { seconds: clock.seconds, active: running, playerKey });

    return (
        <>
            <ResultFlash auction={auction} sound={sound} />
            <div className="mt-3 flex items-center justify-between gap-2">
                <GoingBanner seconds={clock.seconds} active={running} />
                <SoundToggle sound={sound} />
            </div>
        </>
    );
}
