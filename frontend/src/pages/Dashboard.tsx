/**
 * Dashboard.tsx
 * 
 * Purpose: Router component that shows different dashboards based on user role
 * - Officials (Manager, TL, HR, etc.) see OfficialsDashboard
 * - Workers (Developers, QA, etc.) see WorkersDashboard
 */

import { useState, useEffect } from 'react';
import OfficialsDashboard from './OfficialsDashboard';
import WorkersDashboard from './WorkersDashboard';
import { useAuth } from '../contexts/AuthContext';
import { checkAndCreateSampleData } from '../utils/sampleData';

// Define official roles that can access OfficialsDashboard
// These are the higher-level roles (managers, leads, directors, etc.)
const OFFICIAL_ROLES = [
  'ceo',
  'cto',
  'vp_engineering',
  'director',
  'engineering_manager',
  'product_manager',
  'team_lead',
  'hr_manager'
];

// Worker roles (developers, QA, designers, etc.) will see WorkersDashboard
// worker roles: senior_developer, developer, junior_developer, qa_engineer, devops_engineer, designer, intern

function Dashboard() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<'official' | 'worker'>('worker');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      // Get role from user metadata
      const role = user.user_metadata?.role;

      // Check if user has official role
      if (role && OFFICIAL_ROLES.includes(role)) {
        setUserRole('official');
      } else {
        setUserRole('worker');
      }

      // Create sample data for demonstration if none exists
      checkAndCreateSampleData(user.id).catch(console.error);

      setIsLoading(false);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-red-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Render appropriate dashboard based on role
  return userRole === 'official' ? <OfficialsDashboard /> : <WorkersDashboard />;
}

export default Dashboard;
