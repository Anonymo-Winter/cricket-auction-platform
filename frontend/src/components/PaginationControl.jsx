import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

// components/PaginationControls.jsx
const PaginationControls = ({ currentPage, totalPages, onPageChange, itemsPerPage, onItemsPerPageChange }) => {
    return (
        <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-2">
                <Button
                    className="px-3 py-1 text-sm border border-slate-300  bg-navy-700 text-white hover:bg-navy-800 hover:text-white"
                    variant="outline"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                >
                    <span className="block sm:hidden">
                        <ArrowLeftIcon />
                    </span>
                    <span className="hidden sm:block">Previous</span>
                </Button>
                <span className="px-1 md:px-4 text-gray-900">
                    <span className="block sm:hidden">
                        {currentPage}/{totalPages}
                    </span>
                    <span className="hidden sm:block">
                        Page {currentPage} of {totalPages}
                    </span>
                </span>
                <Button
                    variant="outline"
                    onClick={() => onPageChange(currentPage + 1)}
                    className="px-3 py-1 text-sm  border border-slate-300 bg-navy-700 text-white hover:bg-navy-800 hover:text-white"
                    disabled={currentPage >= totalPages}
                >
                    <span className="block sm:hidden">
                        <ArrowRightIcon />
                    </span>
                    <span className="hidden sm:block">Next</span>
                </Button>
            </div>
            <div className="flex items-center gap-2">
                <span className="hidden sm:block">Items per page:</span>
                <Select value={itemsPerPage || "10"} onValueChange={onItemsPerPageChange}>
                    <SelectTrigger className="w-[100px] bg-white">
                        <SelectValue placeholder="Items" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};

export default PaginationControls;
