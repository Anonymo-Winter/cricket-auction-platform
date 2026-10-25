import { useGetAuctionsQuery } from "../api/livebiddingApi";
import AuctionsDisplay from "../components/Allauctions";
import LoadSpinner from "../components/LoadSpinner";

function AllAuctionsPage() {
    const { data, isLoading, isError } = useGetAuctionsQuery({ refetchOnMountOrArgChange: true });

    if (isLoading) {
        return <LoadSpinner />;
    }
    if (isError) {
        return (
            <div className="min-h-[calc(100vh-4rem)] my-auto flex items-center justify-center p-4">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800">Something went wrong!</h2>
                    <p className="text-gray-500 mt-2">Check back later for upcoming auctions.</p>
                </div>
            </div>
        );
    }
    return (
        <div>
            <AuctionsDisplay data={data} />
        </div>
    );
}

export default AllAuctionsPage;
