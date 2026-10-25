import { useLogoutMutation } from "../api/authApi";
import { useDispatch } from "react-redux";
import { clearCredentials } from "../store/authSlice";
import { toast } from "sonner";

const LogoutButton = () => {
    const [logout] = useLogoutMutation();
    const dispatch = useDispatch();

    const handleLogout = async () => {
        try {
            await logout().unwrap();
            dispatch(clearCredentials());
            toast.success("Logout successful!");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return <button onClick={handleLogout}>Logout</button>;
};

export default LogoutButton;
