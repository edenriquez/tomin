import Hero from '@/components/landing/Hero';
import FeatureSection from '@/components/landing/FeatureSection';
import AnxietySection from '@/components/landing/AnxietySection';
import Footer from '@/components/landing/Footer';
import { SpendingDistributionChart, FilterGroupChart } from '@/components/landing/ChartMockups';
import { TrendingUp, Filter, BrainCircuit, LineChart } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-white selection:bg-blue-100">
      <Hero />

      <FeatureSection
        title="Track Spending Distribution"
        description="Understand exactly where your money goes. See a clear breakdown of your spending across different categories like Housing, Food, and Transport."
        index={0}
      >
        <SpendingDistributionChart />
      </FeatureSection>

      <FeatureSection
        title="Filter and Group Transactions"
        description="Dive deep into your data. Group transactions by category or filter by specific concepts like 'Nike' or 'Netflix'. View your spending weekly, bi-weekly, or monthly."
        align="right"
        index={1}
      >
        <FilterGroupChart />
      </FeatureSection>

      <FeatureSection
        title="Track Spending Habits"
        description="Identify recurrent transactions and predict your monthly spendings. Tomin categorizes your habits to help you stay on track."
        index={2}
      >
        <div className="flex flex-col items-center justify-center h-full text-blue-600">
          <TrendingUp size={64} strokeWidth={1.5} />
          <p className="mt-4 font-medium text-gray-500">Smart Habit Tracking</p>
        </div>
      </FeatureSection>

      <FeatureSection
        title="Smart Forecasts"
        description="The heart of Tomin. Adjust forecasts and see how investing more in specific areas affects your future. Get AI suggestions on where to optimize your spending."
        align="right"
        index={3}
      >
        <div className="flex flex-col items-center justify-center h-full text-purple-600">
          <BrainCircuit size={64} strokeWidth={1.5} />
          <p className="mt-4 font-medium text-gray-500">AI-Powered Predictions</p>
        </div>
      </FeatureSection>

      <AnxietySection />

      <Footer />
    </main>
  );
}
