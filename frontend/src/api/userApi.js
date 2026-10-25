import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_ORIGIN } from "../config.js";

export const userApi = createApi({
    reducerPath: "userApi",
    baseQuery: fetchBaseQuery({
        baseUrl: `${API_ORIGIN}/api/user`,
        credentials: "include",
    }),
    endpoints: (builder) => ({
        getAuctioneers: builder.query({
            query: () => "/get-auctioneers",
        }),
        getUsers: builder.query({
            query: () => "/get-users",
        }),
        assignAuctioneers: builder.mutation({
            query: ({ auctioneerId, auctionId }) => ({
                url: "/assign-auctioneer",
                method: "POST",
                body: { auctioneerId, auctionId },
            }),
        }),
        deassignAuctioneers: builder.mutation({
            query: ({ auctioneerId, auctionId }) => ({
                url: "/deassign-auctioneer",
                method: "POST",
                body: { auctioneerId, auctionId },
            }),
        }),
        inviteAuctioneer: builder.mutation({
            query: ({ name, email }) => ({
                url: "/invite-auctioneer",
                method: "POST",
                body: { name, email },
            }),
        }),
        inviteOwner: builder.mutation({
            query: ({ email }) => ({
                url: "/invite-owner",
                method: "POST",
                body: { email },
            }),
        }),
        createResetLink: builder.mutation({
            query: ({ userId }) => ({
                url: "/reset-link",
                method: "POST",
                body: { userId },
            }),
        }),
        setUserStatus: builder.mutation({
            query: ({ userId, status }) => ({
                url: "/set-status",
                method: "POST",
                body: { userId, status },
            }),
        }),
        getAuditLog: builder.query({
            query: ({ page = 1, limit = 25 } = {}) => `/audit-log?page=${page}&limit=${limit}`,
        }),
        checkPassword: builder.mutation({
            query: ({ userId, password }) => ({
                url: "/check-password",
                method: "POST",
                body: { userId, password },
            }),
        }),
        deleteAuctioneer: builder.mutation({
            query: ({ auctioneerId }) => ({
                url: "/delete-auctioneer",
                method: "DELETE",
                body: { auctioneerId },
            }),
        }),
        deleteUser: builder.mutation({
            query: ({ userId }) => ({
                url: "/delete-user",
                method: "DELETE",
                body: { userId },
            }),
        }),
        updateUserRole: builder.mutation({
            query: ({ userId, role }) => ({
                url: "/update-user-role",
                method: "POST",
                body: { userId, role },
            }),
        }),
    }),
});

export const {
    useAssignAuctioneersMutation,
    useDeassignAuctioneersMutation,
    useDeleteAuctioneerMutation,
    useDeleteUserMutation,
    useGetUsersQuery,
    useGetAuctioneersQuery,
    useUpdateUserRoleMutation,
    useCheckPasswordMutation,
    useInviteAuctioneerMutation,
    useInviteOwnerMutation,
    useCreateResetLinkMutation,
    useSetUserStatusMutation,
    useGetAuditLogQuery,
} = userApi;
