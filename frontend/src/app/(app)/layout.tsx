import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/ui";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <ToastProvider>
            <div className="flex min-h-screen">
                <Sidebar />
                {/* 32px gutters, 1200px measure. Pages compose their own
                    vertical rhythm on top of the 48px lead-in. */}
                <main className="min-w-0 flex-1 px-8 py-12">
                    <div className="mx-auto max-w-page">{children}</div>
                </main>
            </div>
        </ToastProvider>
    );
}
