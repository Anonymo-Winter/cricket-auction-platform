// Where the backend lives. Set VITE_API_URL in frontend/.env when it isn't http://localhost:8080
export const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");
