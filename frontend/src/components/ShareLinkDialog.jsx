import * as React from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button.tsx";
import { Input } from "./ui/input.tsx";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog.tsx";
// Shows a one-time link the admin must pass on themselves (there is no email service).
export default function ShareLinkDialog({ data, onClose }) {
    const [copied, setCopied] = React.useState(false);
    React.useEffect(() => setCopied(false), [data?.link]);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(data.link);
            setCopied(true);
            toast.success("Link copied");
        }
        catch {
            toast.error("Couldn't copy automatically — select the link and copy it manually");
        }
    };
    return (<Dialog open={!!data} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{data?.title}</DialogTitle>
                    <DialogDescription>{data?.description}</DialogDescription>
                </DialogHeader>
                <div className="flex gap-2">
                    <Input readOnly value={data?.link ?? ""} onFocus={(e) => e.target.select()}/>
                    <Button type="button" onClick={copy} className="bg-navy-800 text-white hover:bg-navy-700 shrink-0">
                        {copied ? <Check className="mr-2 h-4 w-4"/> : <Copy className="mr-2 h-4 w-4"/>}
                        {copied ? "Copied" : "Copy"}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                    This link is shown only once and works a single time
                    {data?.expiresAt ? ` — it expires ${new Date(data.expiresAt).toLocaleString()}` : ""}.
                </p>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>);
}
