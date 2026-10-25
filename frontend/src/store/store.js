// src/store/index.js
import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage"; // uses localStorage

// authentication
import { authApi } from "../api/authApi";
import authReducer from "./authSlice";

// Live Bidding
import { liveBidApi } from "../api/livebiddingApi";
import liveBidReducer from "./liveBidSlice";

// Auction
import { auctionApi } from "../api/auctionApi";
import auctionReducer from "./auctionSlice";

import { teamApi } from "../api/teamApi";
import teamReducer from "./teamSlice";

import { playerApi } from "../api/playerApi";
import playerReducer from "./playerSlice";

import { userApi } from "../api/userApi";

// Apply persistReducer to the reducers you want to persist
const persistedAuthReducer = persistReducer({ key: "auth", storage }, authReducer);
const persistedAuctionReducer = persistReducer({ key: "auctions", storage }, auctionReducer);
const persistedTeamReducer = persistReducer({ key: "teams", storage }, teamReducer);
const persistedPlayerReducer = persistReducer({ key: "players", storage }, playerReducer);

// Configure Store with direct reducers
const store = configureStore({
    reducer: {
        [authApi.reducerPath]: authApi.reducer,
        auth: persistedAuthReducer, // Use the persisted reducer for auth
        [liveBidApi.reducerPath]: liveBidApi.reducer,
        liveBid: liveBidReducer,
        [auctionApi.reducerPath]: auctionApi.reducer,
        auctions: persistedAuctionReducer,
        [teamApi.reducerPath]: teamApi.reducer,
        teams: persistedTeamReducer,
        [playerApi.reducerPath]: playerApi.reducer,
        players: persistedPlayerReducer,
        [userApi.reducerPath]: userApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
                ignoredPaths: ["register"],
            },
        }).concat(
            authApi.middleware,
            liveBidApi.middleware,
            auctionApi.middleware,
            teamApi.middleware,
            playerApi.middleware,
            userApi.middleware
        ),
});

// Create a persistor to manage the state persistence
const persistor = persistStore(store);

export { store, persistor }; // Export both store and persistor for integration with PersistGate
