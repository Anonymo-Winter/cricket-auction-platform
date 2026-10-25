import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_ORIGIN } from "../config.js";

export const liveBidApi = createApi({
    reducerPath: "liveBidApi",
    baseQuery: fetchBaseQuery({
        baseUrl: `${API_ORIGIN}/api`,
        credentials: "include",
    }),
    endpoints: (builder) => ({
        getPlayers: builder.query({
            query: () => "/players",
        }),
        getPlayerById: builder.query({
            query: (id) => `/players/${id}`,
        }),
        getTeams: builder.query({
            query: () => "/teams",
        }),
        getTeamById: builder.query({
            query: (id) => `/teams/${id}`,
        }),
        getAuctions: builder.query({
            query: () => "/auctions",
        }),
        getAuctionById: builder.query({
            query: (id) => `/auctions/${id}`,
        }),
        startAuction: builder.mutation({
            query: (id) => ({
                url: `/auctions/${id}/start`,
                method: "POST",
            }),
        }),

        getCurrentPlayer: builder.query({
            query: () => "/players/current",
        }),
        getRecentBids: builder.query({
            query: () => "/bids/recent",
        }),
        getAuctionStatus: builder.query({
            query: () => "/auction/status",
        }),
        placebid: builder.mutation({
            query: (bidData) => ({
                url: "/bids",
                method: "POST",
                body: bidData,
            }),
        }),
    }),
});

export const {
    useGetPlayersQuery,
    useGetPlayerByIdQuery,
    useGetTeamsQuery,
    useGetTeamByIdQuery,
    useGetAuctionsQuery,
    useGetAuctionByIdQuery,
    useStartAuctionMutation,

    useGetCurrentPlayerQuery,
    useGetRecentBidsQuery,
    useGetAuctionStatusQuery,
    usePlacebidMutation,
} = liveBidApi;
