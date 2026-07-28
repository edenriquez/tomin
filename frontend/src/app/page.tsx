import Link from "next/link";
import { BarChart3, LineChart, Sparkles, ShieldCheck } from "lucide-react";

export default function LandingPage() {
    return (
        <main className="min-h-screen">
            {/* Nav */}
            <header className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
                <div className="flex items-center gap-2 text-title-sm font-semibold text-ink">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-control bg-ember font-semibold text-ink">
                        T
                    </span>
                    Tomin
                </div>
                <nav className="hidden items-center gap-8 text-body-sm text-graphite md:flex">
                    <a href="#features" className="hover:text-ink">
                        Features
                    </a>
                    <a href="#future" className="hover:text-ink">
                        Pricing
                    </a>
                    <a href="#future" className="hover:text-ink">
                        About
                    </a>
                    <Link
                        href="/inicio"
                        className="rounded-control bg-ember px-4 py-2 font-semibold text-ink"
                    >
                        Get Started
                    </Link>
                </nav>
            </header>

            {/* Hero */}
            <section className="mx-auto grid max-w-7xl items-center gap-12 px-8 py-12 md:grid-cols-2">
                <div>
                    <h1 className="font-display text-display-md font-normal text-ink">
                        Take Control of <br /> Your Peso.
                        <br />
                        <span className="text-ember">Analyze, Forecast,</span>
                        <br />
                        and Grow with AI.
                    </h1>
                    <p className="mt-6 max-w-md text-graphite">
                        Tomin connects to your accounts to provide automated insights, helping you
                        spot spending habits and predict your financial future without the
                        spreadsheet headache.
                    </p>
                    <div className="mt-8 flex gap-3">
                        <input
                            className="w-64 rounded-control border border-mist bg-paper px-4 py-3 text-body text-ink placeholder:text-steel"
                            placeholder="Enter your email address"
                        />
                        <Link
                            href="/inicio"
                            className="rounded-control bg-ember px-6 py-3 font-semibold text-ink"
                        >
                            Start Analyzing for Free
                        </Link>
                    </div>
                    <div className="mt-4 flex items-center gap-6 text-body-sm text-pewter">
                        <span className="flex items-center gap-1">
                            <ShieldCheck size={16} /> Bank-level security
                        </span>
                        <span>No credit card required</span>
                    </div>
                </div>
                <div className="rounded-card border border-abyss bg-abyss p-6 text-paper">
                    <div className="text-body-sm text-steel">Current Net Worth</div>
                    <div className="tabular text-metric font-semibold text-paper">$501,050</div>
                    <div className="mt-6 flex h-48 items-end gap-1 rounded-control border border-graphite p-4">
                        {[40, 65, 50, 80, 60, 90, 75, 100].map((h, i) => (
                            <div
                                key={i}
                                className="flex-1 rounded-t bg-ember"
                                style={{ height: `${h}%`, opacity: 0.35 + (i / 7) * 0.65 }}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="mx-auto max-w-7xl px-8 py-16">
                <h2 className="text-title-lg font-semibold text-ink">Intelligent Finance</h2>
                <p className="mt-2 text-graphite">
                    Everything you need to reduce anxiety and grow your wealth, powered by local
                    Mexican banking integrations.
                </p>
                <div className="mt-10 grid gap-6 md:grid-cols-3">
                    <Feature
                        icon={<BarChart3 className="text-ember" size={20} />}
                        title="AI Income Analysis"
                        body="Understand exactly where your income goes with automated categorization tailored for Mexican lifestyles."
                    />
                    <Feature
                        icon={<LineChart className="text-graphite" size={20} />}
                        title="Smart Forecasts"
                        body="See your balance 30 days into the future based on your spending history and recurring bills."
                    />
                    <Feature
                        icon={<Sparkles className="text-graphite" size={20} />}
                        title="Habit Tracking"
                        body="Identify the small 'gastos hormiga' eating your wallet and set smart limits to stop them early."
                    />
                </div>
            </section>

            <footer className="border-t border-mist py-8 text-center text-body-sm text-pewter">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-control bg-fog">
                {icon}
            </div>
            <h3 className="mt-4 text-title-sm font-semibold text-ink">{title}</h3>
            <p className="mt-2 text-body-sm text-graphite">{body}</p>
        </div>
    );
}
