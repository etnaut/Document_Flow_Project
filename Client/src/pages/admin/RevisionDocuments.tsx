import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { getRevisions } from '@/services/api';
import { RevisionEntry } from '@/types';

const RevisionDocuments: React.FC = () => {
  const [revisions, setRevisions] = useState<RevisionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevisions();
  }, []);

  const fetchRevisions = async () => {
    try {
      const data = await getRevisions();
      setRevisions(data);
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
              Documents returned for revision.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Document</th>
                <th className="px-4 py-2 text-left font-semibold">Sender</th>
                <th className="px-4 py-2 text-left font-semibold">Admin</th>
                <th className="px-4 py-2 text-left font-semibold">Comment</th>
              </tr>
            </thead>
            <tbody>
              {revisions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    No revision entries found.
                  </td>
                </tr>
              ) : (
                revisions.map((rev) => (
                  <tr key={`${rev.document_id}-${rev.user_id}-${rev.comment ?? ''}`} className="border-t">
                    <td className="px-4 py-2">{rev.document_type || '—'}</td>
                    <td className="px-4 py-2">{rev.sender_name || '—'}</td>
                    <td className="px-4 py-2">{rev.admin || '—'}</td>
                    <td className="px-4 py-2 max-w-[320px] break-words text-muted-foreground">{rev.comment || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RevisionDocuments;
