'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatisticsChart from '@/components/dashboard/StatisticsChart';
import IncomeManagement from '@/components/dashboard/IncomeManagement';
import ExpensesRecap from '@/components/dashboard/ExpensesRecap';
import TransactionsHistory from '@/components/dashboard/TransactionsHistory';

function DashboardContent() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar onLogout={logout} />

      {/* Main Content */}
      <div className="ml-20">
        {/* Header */}
        <DashboardHeader
          userName={user?.name}
          userEmail="Personal Account"
          userImage={user?.picture}
        />

        {/* Dashboard Content */}
        <div className="p-8">
          {/* Page Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Statistics Chart (spans 2 columns) */}
            <div className="lg:col-span-2">
              <StatisticsChart />
            </div>

            {/* Right Column - Income Management */}
            <div>
              <IncomeManagement />
            </div>

            {/* Transactions History (spans 2 columns) */}
            <div className="lg:col-span-2">
              <TransactionsHistory />
            </div>

            {/* Expenses Recap */}
            <div>
              <ExpensesRecap />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
