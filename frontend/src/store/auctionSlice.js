import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    selectedAuction: null,
    filterOption: {
        status: "all",
        season: "all",
        sortBy: "name",
    },
    pagination: {
        page: 1,
        limit: 10,
    },
};

const auctionSlice = createSlice({
    name: "auctions",
    initialState,
    reducers: {
        setSelectedAuction: (state, action) => {
            state.selectedAuction = action.payload;
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

export const { setSelectedAuction, setFilterOption, setPagination } = auctionSlice.actions;
export default auctionSlice.reducer;
