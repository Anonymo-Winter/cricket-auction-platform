import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    selectedTeam: null,
    filterOption: {
        sortBy: "name",
    },
    pagination: {
        page: 1,
        limit: 10,
    },
    filters: {},
};

const TeamSlice = createSlice({
    name: "teams",
    initialState,
    reducers: {
        setSelectedTeam: (state, action) => {
            state.selectedTeam = action.payload;
        },
        setFilterOption: (state, action) => {
            state.filterOption = { ...state.filterOption, ...action.payload };
        },
        setPagination: (state, action) => {
            state.pagination = { ...state.pagination, ...action.payload };
        },
        setFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
            state.pagination.page = 1;
        },
    },
});

export const { setSelectedTeam, setFilterOption, setPagination, setFilters } = TeamSlice.actions; // ✅ Export setFilters
export default TeamSlice.reducer;
