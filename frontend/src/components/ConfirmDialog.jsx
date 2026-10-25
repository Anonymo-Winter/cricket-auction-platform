import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "./ui/alert-dialog";
import { useEffect } from "react";

// A small "are you sure?" box used before anything is removed or deleted (instead of the browser's own dialog)
export default function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "Confirm", onConfirm, destructive = true }) {
    // A dialog opened from a dropdown menu can leave the page unclickable; make sure that never sticks
    useEffect(() => {
        if (open) return undefined;
        const id = setTimeout(() => {
            if (document.body.style.pointerEvents === "none") document.body.style.pointerEvents = "";
        }, 350);
        return () => clearTimeout(id);
    }, [open]);

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="font-display tracking-tight text-navy-900">{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className={destructive ? "bg-red-600 text-white hover:bg-red-700" : "bg-navy-900 text-white hover:bg-navy-800"}
                    >
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
