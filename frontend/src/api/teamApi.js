import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_ORIGIN } from "../config.js";

export const teamApi = createApi({
    reducerPath: "teamApi",
    baseQuery: fetchBaseQuery({
        baseUrl: `${API_ORIGIN}/api/team`,
        credentials: "include",
    }),
    tagTypes: ["Team"],
    endpoints: (builder) => ({
        createteam: builder.mutation({
            query: (data) => ({
                url: "/createTeam",
                method: "PUT",
                body: data,
            }),
            invalidatesTags: ["Team"],
        }),
        getTeamsById: builder.query({
            query: (id) => `/${id}`,
            providesTags: ["Team"],
        }),
        updateTeam: builder.mutation({
            query: ({ id, updatedData }) => ({
                url: `/update-team`,
                method: "PATCH",
                body: { id, updatedData },
            }),
            invalidatesTags: ["Team"],
        }),
        markPlayersToTeam: builder.mutation({
            query: ({ teamId, updatedData }) => ({
                url: `/mark-players-to-team/${teamId}`,
                method: "PATCH",
                body: { updatedData },
            }),
        }),
        deletePlayerFromTeam: builder.mutation({
            query: ({ teamId, playerId }) => ({
                url: `/delete-player-from-team`,
                method: "DELETE",
                body: { teamId, playerId },
            }),
        }),
        deleteTeam: builder.mutation({
            query: ({ id }) => ({
                url: `/delete-team/${id}`,
                method: "DELETE",
            }),
        }),
    }),
});

export const {
    useGetTeamsByIdQuery,
    useUpdateTeamMutation,
    useMarkPlayersToTeamMutation,
    useDeletePlayerFromTeamMutation,
    useCreateteamMutation,
    useDeleteTeamMutation,
} = teamApi;
