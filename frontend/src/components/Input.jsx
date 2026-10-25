import { forwardRef } from "react";

const Input = forwardRef(({ icon: Icon, rightSlot, ...props }, ref) => {
    return (
        <div className="relative mb-4">
            {Icon && (
                <Icon className="absolute left-3 top-1/2 size-5 -translate-y-1/2 transform text-slate-400" />
            )}
            <input
                ref={ref}
                className={`w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 text-slate-900 placeholder:text-slate-400 focus:border-navy-600 focus:outline-none focus:ring-2 focus:ring-navy-600/30 ${
                    rightSlot ? "pr-11" : "pr-3"
                }`}
                {...props}
            />
            {rightSlot && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>}
        </div>
    );
});
Input.displayName = "Input";

export default Input;
