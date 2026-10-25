import { NavLink } from "react-router-dom";
import LogoutButton from "./LogoutButton";

const AuthButtons = ({ user }) => {
    if (!user || user === false) {
        return (
            <div className="flex items-center gap-4 text-sm">
                <NavLink to="/login" className="text-white hover:text-gold-300">
                    Sign in
                </NavLink>
                <NavLink
                    to="/signup"
                    className="rounded-md bg-gold-400 px-3 py-1 font-semibold text-navy-950 hover:bg-gold-300"
                >
                    Sign up
                </NavLink>
            </div>
        );
    }
    return <LogoutButton />;
};
export default AuthButtons;
