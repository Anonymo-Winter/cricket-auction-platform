import * as React from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button.tsx";
import { Input } from "./ui/input.tsx";
import { Label } from "./ui/label.tsx";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs.tsx";
import { useInviteAuctioneerMutation, useInviteOwnerMutation } from "../api/userApi.js";
import ShareLinkDialog from "./ShareLinkDialog.jsx";
// Admin invites: an auctioneer sets their own password from the link; a team owner uses it to sign up
// (required when the server runs with SIGNUP_MODE=invite).
export default function InviteDialog() {
    const [open, setOpen] = React.useState(false);
    const [kind, setKind] = React.useState("auctioneer");
    const [name, setName] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [shared, setShared] = React.useState(null);
    const [inviteAuctioneer, { isLoading: invitingAuctioneer }] = useInviteAuctioneerMutation();
    const [inviteOwner, { isLoading: invitingOwner }] = useInviteOwnerMutation();
    const isLoading = invitingAuctioneer || invitingOwner;
    const reset = () => {
        setName("");
        setEmail("");
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (kind === "auctioneer") {
                const res = await inviteAuctioneer({ name, email }).unwrap();
                setShared({
                    title: `Invite link for ${name}`,
                    description: "Send this to the auctioneer. They choose their own password and are signed in as an auctioneer.",
                    link: res.link,
                    expiresAt: res.expiresAt,
                });
            }
            else {
                const res = await inviteOwner({ email: email.trim() || undefined }).unwrap();
                setShared({
                    title: "Team owner invite link",
                    description: email.trim()
                        ? `Only ${email.trim()} can use this link to sign up and create a team.`
                        : "Anyone with this link can sign up and create a team (one use).",
                    link: res.link,
                    expiresAt: res.expiresAt,
                });
            }
            reset();
            setOpen(false);
        }
        catch (error) {
            toast.error(error?.data?.message || "Failed to create invite");
        }
    };
    return (<>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-navy-800 text-white hover:bg-navy-700">
                        <UserPlus className="mr-2 h-4 w-4"/>
                        Invite
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle>Invite someone</DialogTitle>
                            <DialogDescription>
                                You get a one-time link to send them. Nobody else sees it, and it expires in 7 days.
                            </DialogDescription>
                        </DialogHeader>
                        <Tabs value={kind} onValueChange={setKind}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="auctioneer">Auctioneer</TabsTrigger>
                                <TabsTrigger value="owner">Team owner</TabsTrigger>
                            </TabsList>
                            <TabsContent value="auctioneer" className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <Label htmlFor="invite-name">Name</Label>
                                    <Input id="invite-name" required={kind === "auctioneer"} value={name} onChange={(e) => setName(e.target.value)}/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="invite-email">Email</Label>
                                    <Input id="invite-email" type="email" required={kind === "auctioneer"} autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)}/>
                                </div>
                            </TabsContent>
                            <TabsContent value="owner" className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <Label htmlFor="invite-owner-email">Email (optional)</Label>
                                    <Input id="invite-owner-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)}/>
                                    <p className="text-xs text-muted-foreground">
                                        Add an email to lock the invite to that address.
                                    </p>
                                </div>
                            </TabsContent>
                        </Tabs>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading} className="bg-navy-800 text-white hover:bg-navy-700">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Create link
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <ShareLinkDialog data={shared} onClose={() => setShared(null)}/>
        </>);
}
