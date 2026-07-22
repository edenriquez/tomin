import { Sidebar } from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex">
            <Sidebar />
            <main className="flex-1 min-h-screen p-8 max-w-6xl">{children}</main>
        </div>
    );
}
