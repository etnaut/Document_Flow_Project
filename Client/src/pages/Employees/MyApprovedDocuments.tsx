import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocumentsByStatus } from '@/services/api';
import { Document } from '@/types';
import DocumentTable from '@/components/documents/DocumentTable';
import { CheckCircle } from 'lucide-react';

const MyApprovedDocuments: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;
    try {
  const data = await getDocumentsByStatus('Approved', undefined, user.User_Role);
  setDocuments(data.filter((d) => d.User_Id === user.User_Id));
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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
            <CheckCircle className="h-6 w-6 text-success" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Approved Documents</h1>
            <p className="text-muted-foreground">Your documents that have been approved.</p>
          </div>
        </div>
      </div>

  <DocumentTable documents={documents} />
    </div>
  );
};

export default MyApprovedDocuments;