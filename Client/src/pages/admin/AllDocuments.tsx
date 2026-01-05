import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments } from '@/services/api';
import { Document } from '@/types';
import DocumentTable from '@/components/documents/DocumentTable';
import { toast } from '@/hooks/use-toast';

const AllDocuments: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;
    try {
      // Filter by user's department - Admin sees docs sent TO their department
      const data = await getDocuments(undefined, user.User_Role, user.Department);
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({ title: 'Failed to load documents', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // No action handlers needed for this simplified view

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
        <h1 className="text-3xl font-bold text-foreground">All Documents</h1>
        <p className="mt-1 text-muted-foreground">
          Documents sent to {user?.Department} department.
        </p>
      </div>

      <DocumentTable
        documents={documents}
        showPriority={false}
        showDescription={true}
      />
    </div>
  );
};

export default AllDocuments;
