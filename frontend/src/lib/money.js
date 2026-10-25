// 1 Cr = 10,000,000 and 1 L = 100,000
export const formatMoney = (amount) => {
    const n = Number(amount) || 0;
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(n % 10000000 === 0 ? 0 : 2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)} L`;
    return `₹${n.toLocaleString("en-IN")}`;
};
