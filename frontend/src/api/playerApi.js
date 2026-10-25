import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_ORIGIN } from "../config.js";

export const playerApi = createApi({
    reducerPath: "playerApi",
    baseQuery: fetchBaseQuery({
        baseUrl: `${API_ORIGIN}/api/player`,
        credentials: "include",
    }),
    tagTypes: ["Player"],
    endpoints: (builder) => ({
        createPlayer: builder.mutation({
            query: (playerData) => ({
                url: "/createPlayer",
                method: "PUT",
                body: playerData,
            }),
            invalidatesTags: ["Player"],
        }),
        importPlayers: builder.mutation({
            query: ({ rows, dryRun = false }) => ({
                url: "/import",
                method: "POST",
                body: { rows, dryRun },
            }),
            invalidatesTags: (result, error, { dryRun }) => (dryRun ? [] : ["Player"]),
        }),
        getAllPlayers: builder.query({
            query: ({ page = 1, limit = 10, status = "", season = "", sortBy = "", sortOrder = "asc" } = {}) => ({
                url: `/`,
                params: { page, limit, status, season, sortBy, sortOrder },
                method: "GET",
            }),
            providesTags: ["Player"],
        }),
        getPlayerById: builder.query({
            query: (id) => `/${id}`,
            providesTags: ["Player"],
        }),
        getAvailablePlayers: builder.query({
            query: (teamId) => `/availablePlayers/${teamId}`,
            providesTags: ["Player"],
        }),
        updatePlayer: builder.mutation({
            query: ({ id, updatedData }) => ({
                url: `/update-player/${id}`,
                method: "PATCH",
                body: { id, updatedData },
            }),
            invalidatesTags: ["Team"],
        }),
        deletePlayer: builder.mutation({
            query: ({ id }) => ({
                url: `/delete-player/${id}`,
                method: "DELETE",
            }),
        }),
    }),
});

export const {
    useGetPlayerByIdQuery,
    useGetAllPlayersQuery,
    useGetAvailablePlayersQuery,
    useUpdatePlayerMutation,
    useDeletePlayerMutation,
    useCreatePlayerMutation,
    useImportPlayersMutation,
} = playerApi;
