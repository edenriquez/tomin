import Hero from '@/components/landing/Hero';
import FeatureSection from '@/components/landing/FeatureSection';
import AnxietySection from '@/components/landing/AnxietySection';
import Footer from '@/components/landing/Footer';
import { SpendingDistributionChart, FilterGroupChart } from '@/components/landing/ChartMockups';
import { TrendingUp, BrainCircuit } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 selection:bg-purple-200 selection:text-purple-900 relative">

      <div className="relative z-10">
        <Hero />

        <FeatureSection
          title="Rastrea la Distribución de Gastos"
          description="Entiende exactamente a dónde va tu dinero. Ve un desglose claro de tus gastos en diferentes categorías como Vivienda, Comida y Transporte."
          index={0}
        >
          <SpendingDistributionChart />
        </FeatureSection>

        <FeatureSection
          title="Filtra y Agrupa Transacciones"
          description="Profundiza en tus datos. Agrupa transacciones por categoría o filtra por conceptos específicos como 'Nike' o 'Netflix'. Visualiza tus gastos semanal, quincenal o mensualmente."
          align="right"
          index={1}
        >
          <FilterGroupChart />
        </FeatureSection>

        <FeatureSection
          title="Rastrea Hábitos de Gasto"
          description="Identifica transacciones recurrentes y predice tus gastos mensuales. Tomin categoriza tus hábitos para ayudarte a mantener el rumbo."
          index={2}
        >
          <div className="flex flex-col items-center justify-center h-full text-purple-600">
            <TrendingUp size={64} strokeWidth={1.5} />
            <p className="mt-4 font-medium text-gray-600">Seguimiento Inteligente de Hábitos</p>
          </div>
        </FeatureSection>

        <FeatureSection
          title="Pronósticos Inteligentes"
          description="El corazón de Tomin. Ajusta pronósticos y ve cómo invertir más en áreas específicas afecta tu futuro. Obtén sugerencias de IA sobre dónde optimizar tus gastos."
          align="right"
          index={3}
        >
          <div className="flex flex-col items-center justify-center h-full text-purple-600">
            <BrainCircuit size={64} strokeWidth={1.5} />
            <p className="mt-4 font-medium text-gray-600">Predicciones Impulsadas por IA</p>
          </div>
        </FeatureSection>

        <AnxietySection />

        <Footer />
      </div>
    </main>
  );
}
