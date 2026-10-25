// Career numbers for the player on screen. Which tiles show depends on the player's role.
const num = (value, digits) => {
    if (value === undefined || value === null) return "—";
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return digits !== undefined ? n.toFixed(digits) : n.toLocaleString("en-IN");
};

const PlayerStatsSection = ({ player }) => {
    if (!player) return null;
    const bat = player.battingStats || {};
    const bowl = player.bowlingStats || {};
    const keeper = player.wicketkeeper || {};
    const best = `${num(bowl.best_figures?.wickets)}/${num(bowl.best_figures?.runs)}`;

    const batting = [
        ["Matches", num(player.matches)],
        ["Runs", num(bat.runs)],
        ["Average", num(bat.average, 2)],
        ["Strike rate", num(bat.strike_rate, 1)],
        ["Highest score", num(bat.highest_score)],
        ["50s / 100s", `${num(bat.fifties)} / ${num(bat.centuries)}`],
        ["4s / 6s", `${num(bat.fours)} / ${num(bat.sixes)}`],
        ["Not outs", num(bat.notOuts)],
    ];
    const bowling = [
        ["Matches", num(player.matches)],
        ["Wickets", num(bowl.wickets)],
        ["Economy", num(bowl.economy, 2)],
        ["Average", num(bowl.average, 2)],
        ["Best figures", best],
        ["5-wicket hauls", num(bowl.five_wickets)],
        ["Dot balls", num(bowl.dot_balls)],
        ["Overs", num(bowl.overs)],
    ];
    const keeping = [
        ["Catches", num(keeper.catches)],
        ["Stumpings", num(keeper.stumps)],
    ];

    const byRole = {
        batsman: batting,
        bowler: bowling,
        "all-rounder": [
            ["Matches", num(player.matches)],
            ["Runs", num(bat.runs)],
            ["Batting avg", num(bat.average, 2)],
            ["Strike rate", num(bat.strike_rate, 1)],
            ["Wickets", num(bowl.wickets)],
            ["Economy", num(bowl.economy, 2)],
            ["Bowling avg", num(bowl.average, 2)],
            ["Best figures", best],
        ],
        "wicket-keeper-batsman": [...batting.slice(0, 6), ...keeping],
        "wicket-keeper": [["Matches", num(player.matches)], ...keeping],
    };

    const tiles = byRole[String(player.role || "").toLowerCase()] || batting;

    return (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
            {tiles.map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-1 text-lg font-semibold text-navy-900">{value}</p>
                </div>
            ))}
        </div>
    );
};

export default PlayerStatsSection;
