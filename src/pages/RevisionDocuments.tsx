import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocumentsByStatus } from '@/services/api';
import { Document } from '@/types';
import DocumentTable from '@/components/documents/DocumentTable';
import { RotateCcw } from 'lucide-react';

const RevisionDocuments: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;
    try {
      // Filter by user's department - Admin sees revision docs sent TO their department
      const data = await getDocumentsByStatus('Revision', user.Department, user.User_Role);
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-info/10">
            <RotateCcw className="h-6 w-6 text-info" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">For Revision</h1>
            <p className="text-muted-foreground">
              Documents returned for revision ({user?.Department}).
            </p>
          </div>
        </div>
      </div>

      <DocumentTable documents={documents} showActions={false} />
    </div>
  );
};

export default RevisionDocuments;
