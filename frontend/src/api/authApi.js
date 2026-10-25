import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_ORIGIN } from "../config.js";

export const authApi = createApi({
    reducerPath: "authApi",
    baseQuery: fetchBaseQuery({
        baseUrl: `${API_ORIGIN}/api/auth`,
        credentials: "include",
            }),
    endpoints: (builder) => ({
        login: builder.mutation({
            query: (credentials) => ({
                url: "/login",
                method: "POST",
                body: credentials,
            }),
        }),
        logout: builder.mutation({
            query: () => ({
                url: "/logout",
                method: "POST",
            }),
        }),
        signupAndCreateTeam: builder.mutation({
            query: (userData) => ({
                url: "/signup-team",
                method: "POST",
                body: userData,
            }),
        }),
        getSignupConfig: builder.query({
            query: () => "/signup-config",
        }),
        getInviteInfo: builder.query({
            query: (token) => `/invite/${token}`,
        }),
        acceptInvite: builder.mutation({
            query: ({ token, password }) => ({
                url: "/accept-invite",
                method: "POST",
                body: { token, password },
            }),
        }),
        resetPassword: builder.mutation({
            query: ({ token, password }) => ({
                url: "/reset-password",
                method: "POST",
                body: { token, password },
            }),
        }),
        getCurrentUser: builder.query({
            query: () => "/check-auth",
        }),
        editProfile: builder.mutation({
            query: ({ id, updatedData }) => {
                return {
                    url: `/edit-profile/${id}`,
                    method: "POST",
                    body: updatedData,
                };
            },
        }),
        changePassword: builder.mutation({
            query: ({ id, oldPassword, newPassword }) => {
                return {
                    url: `/change-password/${id}`,
                    method: "POST",
                    body: { oldPassword, newPassword },
                };
            },
        }),
        isEmailAlreadyinUse: builder.mutation({
            query: (email) => ({
                url: `/is-email-already-in-use`,
                method: "POST",
                body: { email },
            }),
        }),
    }),
});

export const {
    useLoginMutation,
    useLogoutMutation,
    useSignupAndCreateTeamMutation,
    useGetCurrentUserQuery,
    useGetSignupConfigQuery,
    useGetInviteInfoQuery,
    useAcceptInviteMutation,
    useResetPasswordMutation,
    useChangePasswordMutation,
    useEditProfileMutation,
    useIsEmailAlreadyinUseMutation,
} = authApi;
