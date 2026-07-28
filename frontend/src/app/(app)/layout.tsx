import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/ui";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <ToastProvider>
            <div className="flex">
                <Sidebar />
                <main className="min-h-screen max-w-6xl flex-1 p-8">{children}</main>
            </div>
        </ToastProvider>
    );
}
