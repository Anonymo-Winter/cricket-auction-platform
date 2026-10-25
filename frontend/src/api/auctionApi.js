import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_ORIGIN } from "../config.js";

export const auctionApi = createApi({
    reducerPath: "auctionApi",
    baseQuery: fetchBaseQuery({
        baseUrl: `${API_ORIGIN}/api`,
        credentials: "include",
    }),
    tagTypes: ["Auction"],
    endpoints: (builder) => ({
        getAllAuctions: builder.query({
            query: ({
                page = 1,
                limit = 10,
                status = "",
                search = "",
                season = "",
                sortBy = "",
                sortOrder = "asc",
            } = {}) => ({
                url: "/auction",
                params: { page, limit, search, status, season, sortBy, sortOrder },
            }),
            providesTags: ["Auction"],
        }),
        getAllAvailableAuctions: builder.query({
            query: () => "/auction/available-auctions",
            providesTags: ["Auction"],
        }),
        getAucionHistory: builder.query({
            query: (id) => `/auction/fetch-auction-history/${id}`,
            providesTags: ["Auction"],
        }),
        getSummaryStats: builder.query({
            query: () => `/auction/getsummaryStats`,
            providesTags: ["Auction"],
        }),
        getAuctionById: builder.query({
            query: (id) => `/auction/${id}`,
            providesTags: ["Auction"],
        }),
        getAuctionTeamsSummary: builder.query({
            query: (id) => `/auction/${id}/teams-summary`,
            providesTags: ["Auction"],
        }),
        getAuctionSquads: builder.query({
            query: (id) => `/auction/${id}/squads`,
            providesTags: ["Auction"],
        }),
        getOverviewStats: builder.query({
            query: () => `/stats/overview`,
        }),
        getAuctionStats: builder.query({
            query: (id) => `/stats/auction/${id}`,
        }),
        createAuction: builder.mutation({
            query: (newAuction) => ({
                url: "/auction",
                method: "POST",
                body: newAuction,
            }),
            invalidatesTags: ["Auction"],
        }),
        updateAuction: builder.mutation({
            query: ({ id, updatedData }) => ({
                url: `/auction/update-auction`,
                method: "PATCH",
                body: { id, updatedData },
            }),
            invalidatesTags: ["Auction"],
        }),
        deleteAuction: builder.mutation({
            query: ({ id }) => {
                return {
                    url: `/auction/${id}`,
                    method: "DELETE",
                };
            },
            invalidatesTags: ["Auction"],
        }),
        markPlayers: builder.mutation({
            query: ({ auctionId, playersData }) => ({
                url: "/auction/mark-players-to-sets",
                method: "PATCH",
                body: { auctionId, playersData },
            }),
        }),
        getAvailablePlayers: builder.query({
            query: (id) => {
                return {
                    url: `/auction/available-players/${id}`,
                    method: "GET",
                };
            },
        }),
        getAllTeams: builder.query({
            query: ({ page = 1, limit = 10, status = "", season = "", sortBy = "", sortOrder = "asc" } = {}) => ({
                url: `/auction/getAllTeams`,
                params: { page, limit, status, season, sortBy, sortOrder },
                method: "GET",
            }),
            providesTags: ["Auction"],
        }),
        getAllAvailableTeams: builder.query({
            query: ({ auctionId } = {}) => ({
                url: `/auction/getAllAvailableTeams/${auctionId}`,
                method: "GET",
            }),
            providesTags: ["Auction"],
        }),
        getTeamsById: builder.query({
            query: (id) => `/auction/teams/${id}`,
            providesTags: ["Auction"],
        }),
        addPlayersToAuction: builder.mutation({
            query: ({ id, players }) => ({
                url: `/auction/add-players-to-auction/${id}`,
                method: "PATCH",
                body: { players },
            }),
            providesTags: ["Auction"],
        }),
        addTeamsToAuction: builder.mutation({
            query: ({ id, teams }) => ({
                url: `/auction/add-teams-to-auction/${id}`,
                method: "PATCH",
                body: { teams },
            }),
            providesTags: ["Auction"],
        }),
        deleteTeamFromAuction: builder.mutation({
            query: ({ id, teamId }) => ({
                url: `/auction/delete-teams-from-auction/${id}`,
                method: "DELETE",
                body: { teamId },
            }),
            providesTags: ["Auction"],
        }),
        deletePlayerFromAuction: builder.mutation({
            query: ({ id, playerId }) => ({
                url: `/auction/delete-player-from-auction/${id}`,
                method: "DELETE",
                body: { playerId },
            }),
            providesTags: ["Auction"],
        }),
        createNewAuction: builder.mutation({
            query: (updatedData) => ({
                url: `/auction/create-new-auction`,
                method: "POST",
                body: updatedData,
            }),
            providesTags: ["Auction"],
        }),
        getAssignedAuctions: builder.query({
            query: ({ auctioneerId }) => {
                return {
                    url: `/auction/getAssignedAuctions/${auctioneerId}`,
                };
            },
            providesTags: ["Auction"],
        }),
        stopAuction: builder.mutation({
            query: ({ auctioneerId, auctionId }) => ({
                url: `/auction/stop-auction/${auctionId}`,
                method: "POST",
                body: { auctioneerId },
            }),
            providesTags: ["Auction"],
        }),
        startAuction: builder.mutation({
            query: ({ auctioneerId, auctionId }) => ({
                url: `/auction/start-auction/${auctionId}`,
                method: "POST",
                body: { auctioneerId },
            }),
            providesTags: ["Auction"],
        }),
        movetoNextPlayer: builder.mutation({
            query: ({ auctioneerId, auctionId }) => ({
                url: `/auction/move-to-next-player/${auctionId}`,
                method: "POST",
                body: { auctioneerId },
            }),
            providesTags: ["Auction"],
        }),
        completeAuction: builder.mutation({
            query: ({ auctioneerId, auctionId }) => {
                return {
                    url: `/auction/complete-auction/${auctionId}`,
                    method: "POST",
                    body: { auctioneerId },
                };
            },
            providesTags: ["Auction"],
        }),
        registerToAuction: builder.mutation({
            query: ({ auctionId, teamId }) => ({
                url: "/auction/register-to-auction",
                method: "POST",
                body: { auctionId, teamId },
            }),
        }),
    }),
});

export const {
    useGetAuctionTeamsSummaryQuery,
    useGetAuctionSquadsQuery,
    useGetOverviewStatsQuery,
    useGetAuctionStatsQuery,
    useGetAllAuctionsQuery,
    useGetAuctionByIdQuery,
    useCreateAuctionMutation,
    useUpdateAuctionMutation,
    useDeleteAuctionMutation,
    useMarkPlayersMutation,
    useGetAvailablePlayersQuery,
    useGetAllTeamsQuery,
    useAddPlayersToAuctionMutation,
    useAddTeamsToAuctionMutation,
    useGetAllAvailableTeamsQuery,
    useDeleteTeamFromAuctionMutation,
    useDeletePlayerFromAuctionMutation,
    useGetAllAvailableAuctionsQuery,
    useGetSummaryStatsQuery,
    useCreateNewAuctionMutation,
    useGetAssignedAuctionsQuery,
    useStopAuctionMutation,
    useStartAuctionMutation,
    useCompleteAuctionMutation,
    useGetAucionHistoryQuery,
    useRegisterToAuctionMutation,
} = auctionApi;
