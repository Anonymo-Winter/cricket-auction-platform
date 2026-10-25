import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    selectedPlayer: null,
    filterOption: {
        sortBy: "name",
    },
    pagination: {
        page: 1,
        limit: 10,
    },
    filters: {},
};

const PlayerSlice = createSlice({
    name: "players",
    initialState,
    reducers: {
        setSelectedPlayer: (state, action) => {
            state.selectedPlayer = action.payload;
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

export const { setSelectedPlayer, setFilterOption, setPagination, setFilters } = PlayerSlice.actions;
export default PlayerSlice.reducer;
