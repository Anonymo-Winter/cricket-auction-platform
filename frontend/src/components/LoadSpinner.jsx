import { motion } from "framer-motion";

const LoadSpinner = () => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <motion.div
                className="w-10 h-10 border-4 border-t-4 mx-auto border-t-blue-500 border-slate-200 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            ></motion.div>
        </div>
    );
};

export default LoadSpinner;
