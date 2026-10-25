const getTeamGradients = (theme) => {
    // Base color mapping
    const themeColors = {
        // Chromatic themes
        yellow: {
            primary: "#facc15", // yellow-400
            secondary: "#a16207", // yellow-700
            tertiary: "#fef08a", // yellow-200
            gradients: [
                "linear-gradient(0deg, #facc15, #a16207, #fef08a)",
                "linear-gradient(90deg, #a16207, #facc15, #fef08a)",
                "linear-gradient(180deg, #fef08a, #facc15, #a16207)",
                "linear-gradient(270deg, #a16207, #fef08a, #facc15)",
                "linear-gradient(0deg, #facc15, #a16207, #fef08a)",
            ],
        },
        blue: {
            primary: "#3b82f6", // blue-500
            secondary: "#1d4ed8", // blue-700
            tertiary: "#93c5fd", // blue-300
            gradients: [
                "linear-gradient(0deg, #3b82f6, #1d4ed8, #93c5fd)",
                "linear-gradient(90deg, #1d4ed8, #3b82f6, #93c5fd)",
                "linear-gradient(180deg, #93c5fd, #3b82f6, #1d4ed8)",
                "linear-gradient(270deg, #1d4ed8, #93c5fd, #3b82f6)",
                "linear-gradient(0deg, #3b82f6, #1d4ed8, #93c5fd)",
            ],
        },
        red: {
            primary: "#ef4444", // red-500
            secondary: "#b91c1c", // red-700
            tertiary: "#fca5a5", // red-300
            gradients: [
                "linear-gradient(0deg, #ef4444, #b91c1c, #fca5a5)",
                "linear-gradient(90deg, #b91c1c, #ef4444, #fca5a5)",
                "linear-gradient(180deg, #fca5a5, #ef4444, #b91c1c)",
                "linear-gradient(270deg, #b91c1c, #fca5a5, #ef4444)",
                "linear-gradient(0deg, #ef4444, #b91c1c, #fca5a5)",
            ],
        },
        black: {
            primary: "#1f2937", // gray-800
            secondary: "#000000", // black
            tertiary: "#4b5563", // gray-600
            gradients: [
                "linear-gradient(0deg, #1f2937, #000000, #4b5563)",
                "linear-gradient(90deg, #000000, #1f2937, #4b5563)",
                "linear-gradient(180deg, #4b5563, #1f2937, #000000)",
                "linear-gradient(270deg, #000000, #4b5563, #1f2937)",
                "linear-gradient(0deg, #1f2937, #000000, #4b5563)",
            ],
        },
        purple: {
            primary: "#8b5cf6", // purple-500
            secondary: "#6d28d9", // purple-700
            tertiary: "#c4b5fd", // purple-300
            gradients: [
                "linear-gradient(0deg, #8b5cf6, #6d28d9, #c4b5fd)",
                "linear-gradient(90deg, #6d28d9, #8b5cf6, #c4b5fd)",
                "linear-gradient(180deg, #c4b5fd, #8b5cf6, #6d28d9)",
                "linear-gradient(270deg, #6d28d9, #c4b5fd, #8b5cf6)",
                "linear-gradient(0deg, #8b5cf6, #6d28d9, #c4b5fd)",
            ],
        },
        pink: {
            primary: "#f472b6", // pink-400
            secondary: "#db2777", // pink-600
            tertiary: "#f9a8d4", // pink-300
            gradients: [
                "linear-gradient(0deg, #f472b6, #db2777, #f9a8d4)",
                "linear-gradient(90deg, #db2777, #f472b6, #f9a8d4)",
                "linear-gradient(180deg, #f9a8d4, #f472b6, #db2777)",
                "linear-gradient(270deg, #db2777, #f9a8d4, #f472b6)",
                "linear-gradient(0deg, #f472b6, #db2777, #f9a8d4)",
            ],
        },
        orange: {
            primary: "#f97316", // orange-500
            secondary: "#c2410c", // orange-700
            tertiary: "#fdba74", // orange-300
            gradients: [
                "linear-gradient(0deg, #f97316, #c2410c, #fdba74)",
                "linear-gradient(90deg, #c2410c, #f97316, #fdba74)",
                "linear-gradient(180deg, #fdba74, #f97316, #c2410c)",
                "linear-gradient(270deg, #c2410c, #fdba74, #f97316)",
                "linear-gradient(0deg, #f97316, #c2410c, #fdba74)",
            ],
        },
        silver: {
            primary: "#d1d5db", // gray-300
            secondary: "#6b7280", // gray-500
            tertiary: "#e5e7eb", // gray-200
            gradients: [
                "linear-gradient(0deg, #d1d5db, #6b7280, #e5e7eb)",
                "linear-gradient(90deg, #6b7280, #d1d5db, #e5e7eb)",
                "linear-gradient(180deg, #e5e7eb, #d1d5db, #6b7280)",
                "linear-gradient(270deg, #6b7280, #e5e7eb, #d1d5db)",
                "linear-gradient(0deg, #d1d5db, #6b7280, #e5e7eb)",
            ],
        },
        lightblue: {
            primary: "#38bdf8", // sky-400
            secondary: "#0284c7", // sky-600
            tertiary: "#7dd3fc", // sky-300
            gradients: [
                "linear-gradient(0deg, #38bdf8, #0284c7, #7dd3fc)",
                "linear-gradient(90deg, #0284c7, #38bdf8, #7dd3fc)",
                "linear-gradient(180deg, #7dd3fc, #38bdf8, #0284c7)",
                "linear-gradient(270deg, #0284c7, #7dd3fc, #38bdf8)",
                "linear-gradient(0deg, #38bdf8, #0284c7, #7dd3fc)",
            ],
        },
        darkblue: {
            primary: "#1e3a8a", // blue-900
            secondary: "#111827", // gray-900
            tertiary: "#3b82f6", // blue-500
            gradients: [
                "linear-gradient(0deg, #1e3a8a, #111827, #3b82f6)",
                "linear-gradient(90deg, #111827, #1e3a8a, #3b82f6)",
                "linear-gradient(180deg, #3b82f6, #1e3a8a, #111827)",
                "linear-gradient(270deg, #111827, #3b82f6, #1e3a8a)",
                "linear-gradient(0deg, #1e3a8a, #111827, #3b82f6)",
            ],
        },

        // Combo themes
        redblack: {
            primary: "#dc2626", // red-600
            secondary: "#000000", // black
            tertiary: "#ef4444", // red-500
            gradients: [
                "linear-gradient(0deg, #dc2626, #000000, #ef4444)",
                "linear-gradient(90deg, #000000, #dc2626, #ef4444)",
                "linear-gradient(180deg, #ef4444, #dc2626, #000000)",
                "linear-gradient(270deg, #000000, #ef4444, #dc2626)",
                "linear-gradient(0deg, #dc2626, #000000, #ef4444)",
            ],
        },
        purplegold: {
            primary: "#9333ea", // purple-600
            secondary: "#facc15", // yellow-400
            tertiary: "#c084fc", // purple-400
            gradients: [
                "linear-gradient(0deg, #9333ea, #facc15, #c084fc)",
                "linear-gradient(90deg, #facc15, #9333ea, #c084fc)",
                "linear-gradient(180deg, #c084fc, #9333ea, #facc15)",
                "linear-gradient(270deg, #facc15, #c084fc, #9333ea)",
                "linear-gradient(0deg, #9333ea, #facc15, #c084fc)",
            ],
        },
        pinkblue: {
            primary: "#f472b6", // pink-400
            secondary: "#2563eb", // blue-600
            tertiary: "#f9a8d4", // pink-300
            gradients: [
                "linear-gradient(0deg, #f472b6, #2563eb, #f9a8d4)",
                "linear-gradient(90deg, #2563eb, #f472b6, #f9a8d4)",
                "linear-gradient(180deg, #f9a8d4, #f472b6, #2563eb)",
                "linear-gradient(270deg, #2563eb, #f9a8d4, #f472b6)",
                "linear-gradient(0deg, #f472b6, #2563eb, #f9a8d4)",
            ],
        },
        bluered: {
            primary: "#3b82f6", // blue-500
            secondary: "#dc2626", // red-600
            tertiary: "#93c5fd", // blue-300
            gradients: [
                "linear-gradient(0deg, #3b82f6, #dc2626, #93c5fd)",
                "linear-gradient(90deg, #dc2626, #3b82f6, #93c5fd)",
                "linear-gradient(180deg, #93c5fd, #3b82f6, #dc2626)",
                "linear-gradient(270deg, #dc2626, #93c5fd, #3b82f6)",
                "linear-gradient(0deg, #3b82f6, #dc2626, #93c5fd)",
            ],
        },
        orangeblack: {
            primary: "#f97316", // orange-500
            secondary: "#000000", // black
            tertiary: "#fdba74", // orange-300
            gradients: [
                "linear-gradient(0deg, #f97316, #000000, #fdba74)",
                "linear-gradient(90deg, #000000, #f97316, #fdba74)",
                "linear-gradient(180deg, #fdba74, #f97316, #000000)",
                "linear-gradient(270deg, #000000, #fdba74, #f97316)",
                "linear-gradient(0deg, #f97316, #000000, #fdba74)",
            ],
        },
        redsilver: {
            primary: "#ef4444", // red-500
            secondary: "#9ca3af", // gray-400
            tertiary: "#fca5a5", // red-300
            gradients: [
                "linear-gradient(0deg, #ef4444, #9ca3af, #fca5a5)",
                "linear-gradient(90deg, #9ca3af, #ef4444, #fca5a5)",
                "linear-gradient(180deg, #fca5a5, #ef4444, #9ca3af)",
                "linear-gradient(270deg, #9ca3af, #fca5a5, #ef4444)",
                "linear-gradient(0deg, #ef4444, #9ca3af, #fca5a5)",
            ],
        },
        lightblueorange: {
            primary: "#38bdf8", // sky-400
            secondary: "#f97316", // orange-400
            tertiary: "#7dd3fc", // sky-300
            gradients: [
                "linear-gradient(0deg, #38bdf8, #f97316, #7dd3fc)",
                "linear-gradient(90deg, #f97316, #38bdf8, #7dd3fc)",
                "linear-gradient(180deg, #7dd3fc, #38bdf8, #f97316)",
                "linear-gradient(270deg, #f97316, #7dd3fc, #38bdf8)",
                "linear-gradient(0deg, #38bdf8, #f97316, #7dd3fc)",
            ],
        },
        darkbluegold: {
            primary: "#1e3a8a", // blue-900
            secondary: "#fcd34d", // yellow-300
            tertiary: "#3b82f6", // blue-500
            gradients: [
                "linear-gradient(0deg, #1e3a8a, #fcd34d, #3b82f6)",
                "linear-gradient(90deg, #fcd34d, #1e3a8a, #3b82f6)",
                "linear-gradient(180deg, #3b82f6, #1e3a8a, #fcd34d)",
                "linear-gradient(270deg, #fcd34d, #3b82f6, #1e3a8a)",
                "linear-gradient(0deg, #1e3a8a, #fcd34d, #3b82f6)",
            ],
        },

        // Default fallback theme
        default: {
            primary: "#3b82f6", // blue-500
            secondary: "#4f46e5", // indigo-600
            tertiary: "#93c5fd", // blue-300
            gradients: [
                "linear-gradient(0deg, #3b82f6, #4f46e5, #93c5fd)",
                "linear-gradient(90deg, #4f46e5, #3b82f6, #93c5fd)",
                "linear-gradient(180deg, #93c5fd, #3b82f6, #4f46e5)",
                "linear-gradient(270deg, #4f46e5, #93c5fd, #3b82f6)",
                "linear-gradient(0deg, #3b82f6, #4f46e5, #93c5fd)",
            ],
        },
    };

    return themeColors[theme] || themeColors.default;
};

export default getTeamGradients;
