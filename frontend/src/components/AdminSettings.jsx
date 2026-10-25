import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, LogOut, Settings, Key, Mail, Calendar, Info, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from "react-redux";
import { clearCredentials, setCredentials } from "../store/authSlice";
import { useEditProfileMutation, useLogoutMutation, useChangePasswordMutation } from "../api/authApi";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useCheckPasswordMutation } from "../api/userApi.js";

const AdminProfilePage = () => {
    const [admin, setAdmin] = useState({
        name: "",
        email: "",
        avatar: "",
        role: "",
        lastLogin: "",
        joinDate: "",
    });
    const [activeTab, setActiveTab] = useState("profile");
    const [isEditing, setIsEditing] = useState(false);
    const [editAdmin, setEditAdmin] = useState({});
    const [imagePreview, setImagePreview] = useState(null);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const dispatch = useDispatch();
    const [editProfile, { isLoading }] = useEditProfileMutation();
    const [logout] = useLogoutMutation();
    const [changePassword] = useChangePasswordMutation();

    const [checkPassword] = useCheckPasswordMutation();
    const [verifyPassword, setverifyPassword] = useState(false);
    const [passwordError, setPasswordError] = useState("");

    const user = useSelector((state) => state.auth.user);
    const navigate = useNavigate();

    const toggleBodyPointerEvents = () => {
        document.body.style.pointerEvents = "auto";
    };

    useEffect(() => {
        return () => {
            toggleBodyPointerEvents();
        };
    });

    // Fix 1: Add dependency array to useEffect to prevent infinite re-renders
    useEffect(() => {
        if (user) {
            const userData = {
                name: user?.name || "Anonymous Name",
                email: user?.email,
                avatar: "",
                role: user?.role || "Admin",
                lastLogin: user?.lastlogin || "2024-01-20T10:00:00",
                joinDate: user?.createdAt,
            };
            setAdmin(userData);
            setEditAdmin(userData);
            setImagePreview(userData.avatar);
        }
    }, [user]); // Fix: Add dependency array with user



    const handleLogout = async () => {
        try {
            await logout();
            toast.success("Admin logged out successfully!");
            dispatch(setCredentials(null));
            dispatch(clearCredentials());
            navigate("/auctions");
        } catch (error) {
            toast.error("Failed to logout");
        }
    };

    const handleEditProfile = () => {
        setIsEditing(true);
        setIsChangingPassword(false);
        setEditAdmin({ ...admin });
        setImagePreview(admin.avatar);
    };

    const handleSaveProfile = async () => {
        try {
            const res = await editProfile({ id: user._id, updatedData: { name: editAdmin.name } }).unwrap();
            dispatch(setCredentials(res.user));
            setAdmin({ ...editAdmin });
            toast.success("Profile updated successfully!");
            setIsEditing(false);
        } catch (error) {
            toast.error(`Failed to Edit Profile: ${error.data?.message || "Unknown error"}`);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
    };

    const handleChangePassword = () => {
        setIsEditing(false);
        setIsChangingPassword(true);
    };

    const handleSavePassword = async (e) => {
        e.preventDefault();

        if (!oldPassword || !newPassword || !confirmPassword) {
            setPasswordError("Please fill in all password fields.");
            toast.error("Please fill in all password fields.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError("New password and confirm password do not match.");
            toast.error("New password and confirm password do not match.");
            return;
        }

        try {
            const res = await changePassword({ id: user._id, oldPassword, newPassword });
            if (res.error?.data.success === false) {
                toast.error(`${res.error.data.message.split(":").at(-1)}`);
                return;
            }

            toast.success("Password changed successfully!");
            setIsChangingPassword(false);
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setverifyPassword(false);
        } catch (error) {
            setPasswordError(error.data?.message);
            toast.error(error.data?.message);
        }
        setTimeout(() => {
            setPasswordError("");
        }, 7000);
    };

    const handleCancelPasswordChange = () => {
        setverifyPassword(false);
        setIsChangingPassword(false);
        setOldPassword("");
        setNewPassword("");
        setPasswordError("");
        setConfirmPassword("");
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };


    const handleCheckPassword = async () => {
        if (oldPassword.length < 6) {
            toast.error("Password must be at least 6 characters long");
            return;
        }
        try {
            const res = await checkPassword({ userId: user._id, password: oldPassword });
            if (res?.error?.status === 400) {
                setverifyPassword(false);
                throw new Error(res.error.data.message);
            } else {
                setverifyPassword(true);
            }
        } catch (error) {
            setPasswordError(error.message);
            setTimeout(() => {
                setPasswordError("");
            }, 7000);
            setverifyPassword(false);
            toast.error(error.message);
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 space-y-8 bg-white">
            {/* Admin Header */}
            <motion.div
                initial={{ y: -10, opacity: 0.2 }}
                animate={{ y: 0, opacity: 1 }}
                className="relative overflow-hidden bg-gradient-to-r from-gray-800 to-navy-900 rounded-3xl shadow-xl"
            >
                <div className="relative p-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6 flex-col sm:flex-row">
                            <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                                <AvatarImage src={isEditing ? imagePreview : admin?.avatar} alt={admin?.name} />
                                <AvatarFallback>{admin?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="space-y-2 text-center sm:text-left">
                                <h2 className="text-white text-4xl font-bold">{admin?.name}</h2>
                                <div className="flex items-center gap-3 justify-center sm:justify-start">
                                    <Badge className="bg-blue-400/20 text-white border-0">{admin?.role}</Badge>
                                </div>
                                <p className="text-gray-200">{admin?.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <DropdownMenu
                                onOpenChange={() => {
                                    toggleBodyPointerEvents();
                                }}
                            >
                                <DropdownMenuTrigger>
                                    <Settings className="text-white cursor-pointer size-6" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-40">
                                    <DropdownMenuItem className="cursor-pointer" onClick={handleEditProfile}>
                                        <Edit className="size-4 mr-2" /> Edit Profile
                                    </DropdownMenuItem>

                                    <DropdownMenuItem className="cursor-pointer" onClick={handleChangePassword}>
                                        <Key className="size-4 mr-2" /> Change Password
                                    </DropdownMenuItem>

                                    <DropdownMenuItem className="cursor-pointer text-red-500" onClick={handleLogout}>
                                        <LogOut className="size-4 mr-2" /> Logout
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </motion.div>

            <Dialog open={isEditing} onOpenChange={(open) => setIsEditing(open)}>
                <DialogContent className="bg-slate-50">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Edit your profile</DialogTitle>
                    </DialogHeader>
                    <div>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Name
                                </Label>
                                <Input
                                    type="text"
                                    value={editAdmin.name || ""}
                                    onChange={(e) => setEditAdmin({ ...editAdmin, name: e.target.value })}
                                    placeholder="Admin Name"
                                    className="bg-white w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 transition col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right mt-2">
                                    Email
                                </Label>
                                <div className="col-span-3">
                                    <Input type="email" value={admin?.email || ""} disabled />
                                    <p className="mt-1 text-xs text-slate-500">The email is your sign-in and can&apos;t be changed here.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end w-full mt-4 gap-2">
                            <Button
                                variant="outline"
                                className="flex items-center gap-1 hover:bg-gray-100"
                                onClick={handleCancelEdit}
                            >
                                <X className="w-5 h-5" /> Cancel
                            </Button>
                            <Button
                                className="flex items-center gap-1 bg-navy-700 text-white hover:bg-navy-800"
                                onClick={handleSaveProfile}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    "Saving..."
                                ) : (
                                    <>
                                        <Check className="w-5 h-5" /> Save
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isChangingPassword} onOpenChange={(open) => setIsChangingPassword(open)}>
                <DialogContent className="bg-slate-50">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-semibold">Change Password</DialogTitle>
                    </DialogHeader>
                    {verifyPassword == true ? (
                        <form onSubmit={handleSavePassword}>
                            <Input
                                type="password"
                                autoComplete="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="New Password"
                                className="mb-2 bg-white border border-gray-400"
                                required
                            />
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm New Password"
                                className="mb-2 bg-white border border-gray-400"
                                required
                            />
                            {passwordError && <p className="text-red-500 pb-2">{passwordError}</p>}
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={handleCancelPasswordChange}>
                                    <X className="mr-2" /> Cancel
                                </Button>
                                <Button type="submit">Save Password</Button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <Input
                                type="password"
                                autoComplete="current-password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                placeholder="Old Password"
                                className="bg-white border border-gray-400 rounded-md focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            {passwordError && <p className="text-red-500">{passwordError}</p>}
                            <div className="flex justify-end">
                                <Button type="submit" onClick={handleCheckPassword}>
                                    Check Password
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Tab Navigation */}
            <div className="flex space-x-4 border-b border-gray-200">
                {[{ id: "profile", label: "Profile", icon: <Info className="size-4" /> }].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 border-b-2 bg-slate-50  ${
                            activeTab === tab.id
                                ? "border-slate-300 text-navy-700"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === "profile" && (
                <Card className="bg-white">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold">Admin Profile Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Mail className="size-5 text-gray-500" />
                            <p>Email: {admin?.email || "N/A"}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <Calendar className="size-5 text-gray-500" />
                            <p>Join Date: {formatDate(admin?.joinDate)}</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AdminProfilePage;
