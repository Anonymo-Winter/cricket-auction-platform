import React, { useState } from "react";
import { useCreateNewAuctionMutation } from "../api/auctionApi";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Ready-made sets of rules. Amounts are in rupees (1 Cr = 10,000,000).
const PRESETS = [
    {
        id: "mega",
        label: "Mega auction",
        description: "120 Cr purse, squads of 18 to 25, 30 seconds per player.",
        settings: { minBidIncrement: 500000, bidTimeLimit: 30, maxPursePerTeam: 1200000000, maxOverseasPlayers: 8, maxSquadSize: 25, minSquadSize: 18 },
    },
    {
        id: "mini",
        label: "Mini auction",
        description: "50 Cr purse, squads of 18 to 25, 20 seconds per player.",
        settings: { minBidIncrement: 500000, bidTimeLimit: 20, maxPursePerTeam: 500000000, maxOverseasPlayers: 8, maxSquadSize: 25, minSquadSize: 18 },
    },
    {
        id: "practice",
        label: "Quick practice",
        description: "30 Cr purse, small squads of 3 to 8, 15 seconds per player.",
        settings: { minBidIncrement: 100000, bidTimeLimit: 15, maxPursePerTeam: 300000000, maxOverseasPlayers: 4, maxSquadSize: 8, minSquadSize: 3 },
    },
];

// "2026-03-05T18:00" in local time, the format <input type="datetime-local"> wants
const toLocalInput = (date) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Auctions open by themselves at their start time, so the default is a time that hasn't passed yet: tomorrow, 18:00
const defaultTimes = () => {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(18, 0, 0, 0);
    return { startTime: toLocalInput(start), endTime: toLocalInput(new Date(start.getTime() + 3 * 60 * 60 * 1000)) };
};

const AuctionDetailsForm = () => {
    const [formData, setFormData] = useState(() => ({
        name: "",
        season: new Date().getFullYear(),
        ...defaultTimes(),
        settings: { ...PRESETS[0].settings },
    }));
    const [preset, setPreset] = useState("mega");
    const navigate = useNavigate();
    const [createNewAuction, { isLoading }] = useCreateNewAuctionMutation();

    const [errors, setErrors] = useState({});

    const applyPreset = (p) => {
        setPreset(p.id);
        setFormData((prev) => ({ ...prev, settings: { ...p.settings } }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith("settings.")) setPreset("custom");

        if (name.includes(".")) {
            // Handle nested properties (settings)
            const [parent, child] = name.split(".");
            setFormData({
                ...formData,
                [parent]: {
                    ...formData[parent],
                    [child]: value,
                },
            });
        } else {
            setFormData({
                ...formData,
                [name]: value,
            });
        }
    };

    const validateForm = (formData) => {
        const errors = {};

        if (!formData.name.trim()) errors.name = "Auction name is required";
        if (!formData.season) errors.season = "Season year is required";
        if (!formData.startTime) errors.startTime = "Start time is required";
        if (!formData.endTime) errors.endTime = "End time is required";
        else if (new Date(formData.endTime) <= new Date(formData.startTime)) {
            errors.endTime = "End time must be after start time";
        }
        if (formData.startTime && new Date(formData.startTime) <= new Date()) {
            errors.startTime = "Start time must be in the future. The auction opens by itself at this time.";
        }

        const s = Object.fromEntries(Object.entries(formData.settings).map(([k, v]) => [k, Number(v)]));
        if (!(s.minBidIncrement > 0)) errors.minBidIncrement = "Must be greater than 0";
        if (!(s.bidTimeLimit >= 5 && s.bidTimeLimit <= 300)) errors.bidTimeLimit = "Between 5 and 300 seconds";
        if (!(s.maxPursePerTeam >= s.minBidIncrement)) errors.maxPursePerTeam = "Must be at least the minimum bid increment";
        if (!(s.minSquadSize >= 1)) errors.minSquadSize = "At least 1";
        if (!(s.maxSquadSize >= s.minSquadSize)) errors.maxSquadSize = "Can't be smaller than the min squad size";

        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate form
        const newErrors = validateForm(formData);
        setErrors(newErrors);

        // If errors exist, prevent submission
        if (Object.keys(newErrors).length > 0) return;

        try {
            const settings = Object.fromEntries(Object.entries(formData.settings).map(([k, v]) => [k, Number(v)]));
            // The date inputs hold local time; send an exact instant so the server doesn't read it in ITS timezone
            const res = await createNewAuction({
                ...formData,
                season: Number(formData.season),
                startTime: new Date(formData.startTime).toISOString(),
                endTime: new Date(formData.endTime).toISOString(),
                settings,
            });

            if (res.error?.data?.success === false) {
                toast.error(`Failed to create auction: ${res.error.data.message || "Unknown error"}`);
                return;
            }

            toast.success("Auction created successfully!");
            navigate("/dashboard/auctions");
        } catch (error) {
            console.error("Error saving auction details:", error);
            toast.error(`Failed to create auction: ${error?.data?.message || "Server error"}`);
        }
    };

    // Format currency for display
    const formatCurrency = (value) => {
        const amount = Number(value);
        if (amount >= 10000000) {
            return `₹${(amount / 10000000).toFixed(2)} Cr`;
        } else if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(2)} Lakh`;
        } else {
            return `₹${amount.toLocaleString()}`;
        }
    };

    return (
        <div className="mx-auto p-6 bg-white rounded-lg">
            <h2 className="font-display tracking-tight text-navy-900 text-2xl font-bold mb-6">Create New Auction</h2>

            <form onSubmit={handleSubmit}>
                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-gray-700">Start from a preset</h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {PRESETS.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => applyPreset(p)}
                                className={`rounded-lg border p-3 text-left transition ${
                                    preset === p.id ? "border-navy-700 bg-navy-800 text-white" : "border-gray-300 bg-white hover:border-navy-600"
                                }`}
                            >
                                <span className="block font-semibold">{p.label}</span>
                                <span className={`block text-xs ${preset === p.id ? "text-navy-50/80" : "text-gray-500"}`}>{p.description}</span>
                            </button>
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                        {preset === "custom" ? "Custom rules. " : ""}You can fine-tune every rule below. Rules and times lock once the auction opens.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Details */}
                    <div className="md:col-span-2">
                        <h3 className="text-lg font-semibold mb-3 text-gray-700">Basic Details</h3>
                        <div className="p-4 bg-slate-50 rounded-md">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Auction Name*</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className={`w-full p-2 border rounded-md ${
                                        errors.name ? "border-red-500" : "border-slate-300"
                                    }`}
                                    placeholder="e.g. IPL Mega Auction"
                                />
                                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Season Year*</label>
                                <input
                                    type="number"
                                    name="season"
                                    value={formData.season}
                                    onChange={handleChange}
                                    className={`w-full p-2 border rounded-md ${
                                        errors.season ? "border-red-500" : "border-slate-300"
                                    }`}
                                    placeholder="2025"
                                />
                                {errors.season && <p className="mt-1 text-sm text-red-500">{errors.season}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time*</label>
                                    <input
                                        type="datetime-local"
                                        name="startTime"
                                        value={formData.startTime}
                                        onChange={handleChange}
                                        className={`w-full p-2 border rounded-md ${
                                            errors.startTime ? "border-red-500" : "border-slate-300"
                                        }`}
                                    />
                                    {errors.startTime && (
                                        <p className="mt-1 text-sm text-red-500">{errors.startTime}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time*</label>
                                    <input
                                        type="datetime-local"
                                        name="endTime"
                                        value={formData.endTime}
                                        onChange={handleChange}
                                        className={`w-full p-2 border rounded-md ${
                                            errors.endTime ? "border-red-500" : "border-slate-300"
                                        }`}
                                    />
                                    {errors.endTime && <p className="mt-1 text-sm text-red-500">{errors.endTime}</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Auction Settings */}
                    <div className="md:col-span-2">
                        <h3 className="text-lg font-semibold mb-3 text-gray-700">Auction Settings</h3>
                        <div className="p-4 bg-slate-50 rounded-md">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Minimum Bid Increment
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            name="settings.minBidIncrement"
                                            value={formData.settings.minBidIncrement}
                                            onChange={handleChange}
                                            className="w-full p-2 border border-slate-300 rounded-md"
                                            placeholder="100000"
                                        />
                                        <span className="absolute right-3 top-2 text-sm text-gray-500">
                                            {formatCurrency(formData.settings.minBidIncrement)}
                                        </span>
                                    </div>
                                    {errors.minBidIncrement ? <p className="mt-1 text-sm text-red-500">{errors.minBidIncrement}</p> : <p className="mt-1 text-xs text-gray-500">Smallest raise between two bids</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Bid Time Limit (seconds)
                                    </label>
                                    <input
                                        type="number"
                                        name="settings.bidTimeLimit"
                                        value={formData.settings.bidTimeLimit}
                                        onChange={handleChange}
                                        className="w-full p-2 border border-slate-300 rounded-md"
                                        placeholder="30"
                                    />
                                    {errors.bidTimeLimit ? <p className="mt-1 text-sm text-red-500">{errors.bidTimeLimit}</p> : <p className="mt-1 text-xs text-gray-500">How long each player is up (5 to 300 seconds)</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Max Purse Per Team
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            name="settings.maxPursePerTeam"
                                            value={formData.settings.maxPursePerTeam}
                                            onChange={handleChange}
                                            className="w-full p-2 border border-slate-300 rounded-md"
                                            placeholder="100000000"
                                        />
                                        <span className="absolute right-3 top-2 text-sm text-gray-500">
                                            {formatCurrency(formData.settings.maxPursePerTeam)}
                                        </span>
                                    </div>
                                    {errors.maxPursePerTeam ? <p className="mt-1 text-sm text-red-500">{errors.maxPursePerTeam}</p> : <p className="mt-1 text-xs text-gray-500">Every team starts the auction with this</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Max Overseas Players
                                    </label>
                                    <input
                                        type="number"
                                        name="settings.maxOverseasPlayers"
                                        value={formData.settings.maxOverseasPlayers}
                                        onChange={handleChange}
                                        className="w-full p-2 border border-slate-300 rounded-md"
                                        placeholder="8"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Overseas players allowed per squad</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Min Squad Size
                                    </label>
                                    <input
                                        type="number"
                                        name="settings.minSquadSize"
                                        value={formData.settings.minSquadSize}
                                        onChange={handleChange}
                                        className="w-full p-2 border border-slate-300 rounded-md"
                                        placeholder="18"
                                    />
                                    {errors.minSquadSize ? <p className="mt-1 text-sm text-red-500">{errors.minSquadSize}</p> : <p className="mt-1 text-xs text-gray-500">Teams keep enough purse to reach this</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Max Squad Size
                                    </label>
                                    <input
                                        type="number"
                                        name="settings.maxSquadSize"
                                        value={formData.settings.maxSquadSize}
                                        onChange={handleChange}
                                        className="w-full p-2 border border-slate-300 rounded-md"
                                        placeholder="25"
                                    />
                                    {errors.maxSquadSize ? <p className="mt-1 text-sm text-red-500">{errors.maxSquadSize}</p> : <p className="mt-1 text-xs text-gray-500">Teams stop bidding at this size</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        type="button"
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-3 hover:bg-gray-300"
                        onClick={() => navigate("/dashboard/auctions")}
                    >
                        Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 bg-navy-800 text-white rounded-md hover:bg-navy-700 disabled:opacity-60" disabled={isLoading}>
                        {isLoading ? "Creating..." : "Create Auction"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AuctionDetailsForm;
