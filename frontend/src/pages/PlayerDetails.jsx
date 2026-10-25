import ErrorState from "../components/ErrorState";
import { useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
} from "recharts";
import { Calendar, Clock, Flag, Shield, Activity, Award } from "lucide-react";
import { useGetPlayerByIdQuery } from "../api/playerApi";
import { useParams } from "react-router-dom";

export default function PlayerProfile() {
    const { playerId } = useParams();
    const { data: playeri, isLoading, error, refetch } = useGetPlayerByIdQuery(playerId, {
        refetchOnMountOrArgChange: true,
    });


    const [player] = useState({
        name: "Virat Kohli",
        dateOfBirth: new Date("1988-11-05"),
        nationality: "Indian",
        image: "default-player.png",
        role: "batsman",
        battingStyle: "right-handed",
        bowlingStyle: "right-arm-medium",
        previousTeams: [
            { team: { name: "Royal Challengers Bangalore" }, season: 2020, price: 150000000 },
            { team: { name: "Royal Challengers Bangalore" }, season: 2019, price: 140000000 },
        ],
        iplDebut: 2008,
        matches: 223,
        battingStats: {
            innings: 215,
            runs: 7263,
            average: 37.24,
            strike_rate: 130.42,
            highest_score: 113,
            fifties: 50,
            centuries: 7,
            fours: 643,
            sixes: 234,
            notOuts: 20,
        },
        bowlingStats: {
            innings: 30,
            overs: 50.4,
            wickets: 4,
            economy: 8.8,
            average: 92.5,
            best_figures: {
                wickets: 2,
                runs: 25,
            },
            five_wickets: 0,
            dot_balls: 132,
            runs_conceded: 370,
        },
        basePrice: 20000000,
        currentPrice: 20000000,
        soldPrice: 180000000,
        status: "sold",
        currentTeam: { name: "Royal Challengers Bangalore" },
        specializations: ["Power hitting", "Chase master", "Fielding"],
        rankings: {
            t20: 3,
            ipl: 2,
        },
        isUncapped: false,
        internationalCaps: {
            tests: 100,
            odis: 265,
            t20is: 115,
        },
        availability: "full-season",
    });

    // Format currency in INR crores

    const formatPrice = (price) => {
        return `₹${(price / 10000000).toFixed(2)} Cr`;
    };

    // Calculate age from date of birth
    const getAge = (dateOfBirth) => {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    // Format date
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    // Prepare data for charts
    const battingChartData = [
        { name: "Runs", value: playeri?.data?.battingStats.runs },
        { name: "4s", value: playeri?.data?.battingStats.fours * 4 },
        { name: "6s", value: playeri?.data?.battingStats.sixes * 6 },
        {
            name: "Other",
            value:
                playeri?.data?.battingStats.runs -
                (playeri?.data?.battingStats.fours * 4 + playeri?.data?.battingStats.sixes * 6),
        },
    ];

    const careerData = [
        { name: "Matches", value: playeri?.data?.matches },
        { name: "Innings", value: playeri?.data?.battingStats.innings },
        { name: "50s", value: playeri?.data?.battingStats.fifties },
        { name: "100s", value: playeri?.data?.battingStats.centuries },
    ];

    const COLORS = ["#18326b", "#f59e0b", "#5b7bc0", "#fcd34d"];

    // IPL Experience in years
    const iplExperience = new Date().getFullYear() - playeri?.data?.iplDebut;

    if (isLoading) {
        return (
            <div className="min-h-[calc(100vh-4rem)]  flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="text-sm text-muted-foreground">Loading player details...</p>
                </div>
            </div>
        );
    }

    if (!playeri || error) {
        return <ErrorState error={error || { status: 404 }} what="player" backTo="/auctions" backLabel="Back to auctions" onRetry={refetch} />;
    }

    return (
        <div className="bg-slate-50 min-h-screen">
            {/* Header */}
            <h1 className="font-display tracking-tight text-3xl font-bold text-center pt-5 text-navy-900">Player Profile</h1>

            <div className="container mx-auto p-4">
                {/* Basic Info Card */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex flex-col lg:flex-row">
                        {/* Player Image */}
                        <div className="w-full lg:w-1/4 flex justify-center mb-4 lg:mb-0 ">
                            <div className="w-48 h-48 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden ring ring-offset-2 shadow-lg">
                                {/* <User size={64} className="text-gray-500" /> */}
                                <img src={playeri?.data?.image} />
                            </div>
                        </div>

                        {/* Player Info */}
                        <div className="w-full lg:w-3/4 lg:pl-6">
                            <div className="flex flex-col md:flex-row justify-between mb-4">
                                <h2 className="text-2xl font-bold text-navy-800">{playeri?.data.name}</h2>
                                <div className="mt-2 md:mt-0">
                                    <span
                                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                            player.status === "sold"
                                                ? "bg-green-100 text-green-800"
                                                : player.status === "unsold"
                                                ? "bg-red-100 text-red-800"
                                                : "bg-gray-100 text-gray-800"
                                        }`}
                                    >
                                        {playeri?.data?.status.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center">
                                    <Calendar className="mr-2 text-navy-800" size={20} />
                                    <span className="text-gray-700">
                                        {formatDate(playeri?.data?.dateOfBirth)} ({getAge(playeri?.data?.dateOfBirth)}{" "}
                                        years)
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <Flag className="mr-2 text-navy-800" size={20} />
                                    <span className="text-gray-700">{playeri?.data?.nationality}</span>
                                </div>
                                <div className="flex items-center">
                                    <Shield className="mr-2 text-navy-800" size={20} />
                                    <span className="text-gray-700">
                                        {playeri?.data?.role
                                            .replace(/-/g, " ")
                                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <Activity className="mr-2 text-navy-800" size={20} />
                                    <span className="text-gray-700">
                                        {playeri?.data?.battingStyle
                                            .replace(/-/g, " ")
                                            .replace(/\b\w/g, (l) => l.toUpperCase())}{" "}
                                        Batsman
                                        {playeri?.data?.bowlingStyle !== "none" &&
                                            `, ${playeri?.data?.bowlingStyle
                                                .replace(/-/g, " ")
                                                .replace(/\b\w/g, (l) => l.toUpperCase())} Bowler`}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <Award className="mr-2 text-navy-800" size={20} />
                                    <span className="text-gray-700">
                                        {playeri?.data?.isUncapped ? "Uncapped Player" : "Capped Player"}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <Clock className="mr-2 text-navy-800" size={20} />
                                    <span className="text-gray-700">
                                        {player?.data?.availability === "full-season"
                                            ? "Full Season Availability"
                                            : "Partial Season Availability"}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {playeri.data?.specializations.map((spec, index) => (
                                    <span key={index} className="bg-gold-300/30 text-navy-800 text-xs px-2 py-1 rounded">
                                        {spec}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* IPL Career Card */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-xl font-semibold mb-4 text-navy-800">IPL Career</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">IPL Debut:</span>
                                <span className="font-medium">{playeri?.data?.iplDebut}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Experience:</span>
                                <span className="font-medium">{iplExperience} years</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Matches:</span>
                                <span className="font-medium">{playeri?.data?.matches}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Current Team:</span>
                                <span className="font-medium">{playeri?.data?.currentTeam?.name || "None"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Base Price:</span>
                                <span className="font-medium">{formatPrice(playeri?.data?.basePrice)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Sold Price:</span>
                                <span className="font-medium">{formatPrice(playeri?.data?.soldPrice)}</span>
                            </div>
                        </div>
                    </div>

                    {/* International Experience */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-xl font-semibold mb-4 text-navy-800">International Experience</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Test Matches:</span>
                                <span className="font-medium">{playeri?.data?.internationalCaps.tests}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">ODIs:</span>
                                <span className="font-medium">{playeri?.data?.internationalCaps.odis}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">T20Is:</span>
                                <span className="font-medium">{playeri?.data?.internationalCaps.t20is}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Caps:</span>
                                <span className="font-medium">
                                    {playeri?.data?.internationalCaps.tests +
                                        playeri?.data?.internationalCaps.odis +
                                        playeri?.data?.internationalCaps.t20is}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">T20 Ranking:</span>
                                <span className="font-medium">{playeri?.data?.rankings.t20 || "N/A"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">IPL Ranking:</span>
                                <span className="font-medium">{playeri?.data?.rankings.ipl || "N/A"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Previous Teams */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-xl font-semibold mb-4 text-navy-800">Previous Teams</h3>
                        {player?.data?.previousTeams.length > 0 ? (
                            <div className="space-y-4">
                                {player?.data?.previousTeams.map((team, index) => (
                                    <div key={index} className="border-b pb-3 last:border-0">
                                        <div className="flex justify-between">
                                            <span className="font-medium">{team.team.name}</span>
                                            <span className="text-gray-600">{team.season}</span>
                                        </div>
                                        <div className="text-gray-600 text-sm mt-1">
                                            Price: {formatPrice(team.price)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-500 italic">No previous teams</div>
                        )}
                    </div>
                </div>

                {/* Batting Stats Card */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h3 className="text-xl font-semibold mb-4 text-navy-800">Batting Statistics</h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-slate-50 p-4 rounded-lg text-center">
                            <div className="text-navy-800 text-sm">Runs</div>
                            <div className="text-2xl font-bold">{playeri?.data?.battingStats.runs}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg text-center">
                            <div className="text-navy-800 text-sm">Average</div>
                            <div className="text-2xl font-bold">{playeri?.data?.battingStats.average.toFixed(2)}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg text-center">
                            <div className="text-navy-800 text-sm">Strike Rate</div>
                            <div className="text-2xl font-bold">
                                {playeri?.data?.battingStats.strike_rate.toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg text-center">
                            <div className="text-navy-800 text-sm">Highest Score</div>
                            <div className="text-2xl font-bold">{playeri?.data?.battingStats.highest_score}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white">
                                    <tbody>
                                        <tr className="border-b">
                                            <td className="py-2 px-4 text-gray-600">Innings</td>
                                            <td className="py-2 px-4 font-medium text-right">
                                                {playeri?.data?.battingStats.innings}
                                            </td>
                                        </tr>
                                        <tr className="border-b">
                                            <td className="py-2 px-4 text-gray-600">Not Outs</td>
                                            <td className="py-2 px-4 font-medium text-right">
                                                {playeri?.data?.battingStats.notOuts}
                                            </td>
                                        </tr>
                                        <tr className="border-b">
                                            <td className="py-2 px-4 text-gray-600">Fifties</td>
                                            <td className="py-2 px-4 font-medium text-right">
                                                {playeri?.data?.battingStats.fifties}
                                            </td>
                                        </tr>
                                        <tr className="border-b">
                                            <td className="py-2 px-4 text-gray-600">Centuries</td>
                                            <td className="py-2 px-4 font-medium text-right">
                                                {playeri?.data?.battingStats.centuries}
                                            </td>
                                        </tr>
                                        <tr className="border-b">
                                            <td className="py-2 px-4 text-gray-600">Fours</td>
                                            <td className="py-2 px-4 font-medium text-right">
                                                {playeri?.data?.battingStats.fours}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-4 text-gray-600">Sixes</td>
                                            <td className="py-2 px-4 font-medium text-right">
                                                {playeri?.data?.battingStats.sixes}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={battingChartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#18326b"
                                        dataKey="value"
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {battingChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => [`${value} runs`, "Contribution"]} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Bowling Stats Card */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h3 className="text-xl font-semibold mb-4 text-navy-800">Bowling Statistics</h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-slate-50 p-4 rounded-lg text-center">
                            <div className="text-navy-800 text-sm">Wickets</div>
                            <div className="text-2xl font-bold">{player?.data?.bowlingStats.wickets | "-"}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg text-center">
                            <div className="text-navy-800 text-sm">Economy</div>
                            <div className="text-2xl font-bold">
                                {player?.data?.bowlingStats.economy.toFixed(2) | "-"}
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg text-center">
                            <div className="text-navy-800 text-sm">Average</div>
                            <div className="text-2xl font-bold">
                                {player?.data?.bowlingStats.average.toFixed(2) | "-"}
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg text-center">
                            <div className="text-navy-800 text-sm">Best Figures</div>
                            <div className="text-2xl font-bold">
                                {player?.data?.bowlingStats.best_figures.wickets | "0"}/
                                {player?.data?.bowlingStats.best_figures.runs | "0"}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white">
                            <tbody>
                                <tr className="border-b">
                                    <td className="py-2 px-4 text-gray-600">Innings</td>
                                    <td className="py-2 px-4 font-medium text-right">
                                        {playeri?.data?.bowlingStats.innings}
                                    </td>
                                </tr>
                                <tr className="border-b">
                                    <td className="py-2 px-4 text-gray-600">Overs</td>
                                    <td className="py-2 px-4 font-medium text-right">
                                        {playeri?.data?.bowlingStats.overs}
                                    </td>
                                </tr>
                                <tr className="border-b">
                                    <td className="py-2 px-4 text-gray-600">Five Wicket Hauls</td>
                                    <td className="py-2 px-4 font-medium text-right">
                                        {playeri?.data?.bowlingStats.five_wickets}
                                    </td>
                                </tr>
                                <tr className="border-b">
                                    <td className="py-2 px-4 text-gray-600">Dot Balls</td>
                                    <td className="py-2 px-4 font-medium text-right">
                                        {playeri?.data?.bowlingStats.dot_balls}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-4 text-gray-600">Runs Conceded</td>
                                    <td className="py-2 px-4 font-medium text-right">
                                        {playeri?.data?.bowlingStats.runs_conceded}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Career Progress Chart */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-xl font-semibold mb-4 text-navy-800">Career Summary</h3>

                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={careerData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" fill="#18326b" name="Count" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
