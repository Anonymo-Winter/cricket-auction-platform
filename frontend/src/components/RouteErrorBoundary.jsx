import { Component } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

// Catches a crash while a page is drawing, so people see a friendly screen instead of a blank page.
// The app gives it `key={pathname}`, so moving to another page resets it.
export default class RouteErrorBoundary extends Component {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error, info) {
        console.error("Page crashed:", error, info?.componentStack);
    }

    render() {
        if (!this.state.failed) return this.props.children;
        return (
            <div className="flex min-h-[60vh] w-full items-center justify-center px-4 py-16" role="alert">
                <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-900 text-gold-400">
                        <AlertTriangle className="h-7 w-7" />
                    </span>
                    <h2 className="font-display text-xl font-bold tracking-tight text-navy-900">Something went wrong</h2>
                    <p className="mt-2 text-sm text-slate-500">This page ran into a problem. Reloading usually fixes it.</p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center gap-2 rounded-lg bg-gold-400 px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-gold-300"
                        >
                            <RefreshCw className="h-4 w-4" /> Reload page
                        </button>
                        <a
                            href="/auctions"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                            <Home className="h-4 w-4" /> Go to auctions
                        </a>
                    </div>
                </div>
            </div>
        );
    }
}
