import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardStats, getDocuments } from '@/services/api';
import { Document } from '@/types';
import StatCard from '@/components/dashboard/StatCard';
import DocumentTable from '@/components/documents/DocumentTable';
import { FileText, Clock, CheckCircle, RotateCcw } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    revision: 0,
  });
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Pass user's department for filtering (Admin sees docs sent TO their dept)
        const [statsData, docsData] = await Promise.all([
          getDashboardStats(user.User_Id, user.User_Role, user.Department),
          getDocuments(user.User_Id, user.User_Role, user.Department),
        ]);
        
        // Keep only the fields we display (exclude released)
        setStats({
          total: statsData.total ?? 0,
          pending: statsData.pending ?? 0,
          approved: statsData.approved ?? 0,
          revision: statsData.revision ?? 0,
        });
        setRecentDocuments(docsData.slice(0, 5));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-slide-up">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome, {user?.Full_Name}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {user?.User_Role === 'Admin'
            ? `Viewing documents sent to ${user?.Department} department.`
            : 'Here\'s an overview of your document activities.'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Documents" value={stats.total} icon={FileText} variant="default" />
        <StatCard title="Pending" value={stats.pending} icon={Clock} variant="warning" />
        <StatCard title="Approved" value={stats.approved} icon={CheckCircle} variant="success" />
        <StatCard title="For Revision" value={stats.revision} icon={RotateCcw} variant="info" />
      </div>

      {/* Recent Documents */}
      <div className="animate-slide-up">
        <h2 className="mb-4 text-xl font-semibold text-foreground">Recent Documents</h2>
  <DocumentTable documents={recentDocuments} showDescription />
      </div>
    </div>
  );
};

export default Dashboard;
