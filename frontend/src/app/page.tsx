import Link from "next/link";
import { BarChart3, LineChart, Sparkles, ShieldCheck } from "lucide-react";

export default function LandingPage() {
    return (
        <main className="min-h-screen">
            {/* Nav */}
            <header className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
                <div className="flex items-center gap-2 font-bold text-xl">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
                        T
                    </span>
                    Tomin
                </div>
                <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600">
                    <a href="#features">Features</a>
                    <a href="#future">Pricing</a>
                    <a href="#future">About</a>
                    <Link href="/dashboard" className="rounded-lg bg-brand px-4 py-2 text-white">
                        Get Started
                    </Link>
                </nav>
            </header>

            {/* Hero */}
            <section className="px-8 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center py-12">
                <div>
                    <h1 className="text-5xl font-extrabold leading-tight">
                        Take Control of <br /> Your Peso.
                        <br />
                        <span className="text-brand">Analyze, Forecast,</span>
                        <br />
                        and Grow with AI.
                    </h1>
                    <p className="mt-6 text-slate-600 max-w-md">
                        Tomin connects to your accounts to provide automated insights, helping you
                        spot spending habits and predict your financial future without the
                        spreadsheet headache.
                    </p>
                    <div className="mt-8 flex gap-3">
                        <input
                            className="rounded-lg border border-slate-300 px-4 py-3 w-64"
                            placeholder="Enter your email address"
                        />
                        <Link
                            href="/dashboard"
                            className="rounded-lg bg-brand px-6 py-3 text-white font-medium"
                        >
                            Start Analyzing for Free
                        </Link>
                    </div>
                    <div className="mt-4 flex items-center gap-6 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                            <ShieldCheck size={16} /> Bank-level security
                        </span>
                        <span>No credit card required</span>
                    </div>
                </div>
                <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-2xl">
                    <div className="text-sm text-slate-400">Current Net Worth</div>
                    <div className="text-3xl font-bold">$501,050</div>
                    <div className="mt-6 h-48 rounded-lg bg-gradient-to-tr from-brand/40 to-cyan-400/30 flex items-end gap-1 p-4">
                        {[40, 65, 50, 80, 60, 90, 75, 100].map((h, i) => (
                            <div
                                key={i}
                                className="flex-1 rounded-t bg-brand"
                                style={{ height: `${h}%` }}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="px-8 max-w-7xl mx-auto py-16">
                <h2 className="text-3xl font-bold">Intelligent Finance</h2>
                <p className="text-slate-600 mt-2">
                    Everything you need to reduce anxiety and grow your wealth, powered by local
                    Mexican banking integrations.
                </p>
                <div className="grid md:grid-cols-3 gap-6 mt-10">
                    <Feature
                        icon={<BarChart3 className="text-brand" />}
                        title="AI Income Analysis"
                        body="Understand exactly where your income goes with automated categorization tailored for Mexican lifestyles."
                    />
                    <Feature
                        icon={<LineChart className="text-emerald-500" />}
                        title="Smart Forecasts"
                        body="See your balance 30 days into the future based on your spending history and recurring bills."
                    />
                    <Feature
                        icon={<Sparkles className="text-purple-500" />}
                        title="Habit Tracking"
                        body="Identify the small 'gastos hormiga' eating your wallet and set smart limits to stop them early."
                    />
                </div>
            </section>

            <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
                (c) 2026 Tomin Inc. Making financial freedom accessible to every Mexican.
            </footer>
        </main>
    );
}

function Feature({
    icon,
    title,
    body,
}: {
    icon: React.ReactNode;
    title: string;
    body: string;
}) {
    return (
        <div className="card">
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                {icon}
            </div>
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p className="text-sm text-slate-600 mt-2">{body}</p>
        </div>
    );
}
