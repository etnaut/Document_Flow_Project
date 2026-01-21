import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { getRevisions } from '@/services/api';
import { RevisionEntry } from '@/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';

const RevisionDocuments: React.FC = () => {
  const { user } = useAuth();
  const [revisions, setRevisions] = useState<RevisionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchRevisions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchRevisions = async () => {
    try {
      const data = await getRevisions();
      let filtered = data;
      if (user) {
        // Only show if sender_name matches user's department/division
        filtered = data.filter((rev: any) => {
          // If sender_name is structured as "Name (Department, Division)", parse it
          // Otherwise, fallback to matching by department/division if available
          // This assumes sender_name or other fields may contain department/division info
          // If not, skip filtering
          if (rev.sender_department && rev.sender_division) {
            return rev.sender_department === user.Department && rev.sender_division === user.Division;
          }
          return true;
        });
      }
      setRevisions(filtered);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return revisions;
    return revisions.filter((rev) => [rev.document_type || '', rev.sender_name || '', rev.admin || '', rev.comment || '']
      .join(' ').toLowerCase().includes(q));
  }, [revisions, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setPage(1); }, [query, pageSize, revisions]);

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
        <div className="flex items-center justify-between p-3 border-b gap-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search revisions..." className="w-[260px]" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(parseInt(v))}>
              <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5,10,20,50].map((n) => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse [&_th]:border [&_td]:border [&_th]:border-gray-300 [&_td]:border-gray-300 [&_th]:text-center [&_td]:text-center">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 font-semibold">Document</th>
                <th className="px-4 py-2 font-semibold">Sender</th>
                <th className="px-4 py-2 font-semibold">Date</th>
                <th className="px-4 py-2 font-semibold">Admin</th>
                <th className="px-4 py-2 font-semibold">Comment</th>
              </tr>
            </thead>
            <tbody>
              {pageSlice.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No revision entries found.
                  </td>
                </tr>
              ) : (
                pageSlice.map((rev) => (
                  <tr key={`${rev.document_id}-${rev.user_id}-${rev.comment ?? ''}`} className="border-t border-gray-300">
                    <td className="px-4 py-2">{rev.document_type || '—'}</td>
                    <td className="px-4 py-2">{rev.sender_name || '—'}</td>
                    <td className="px-4 py-2">{formatDate(rev.created_at)}</td>
                    <td className="px-4 py-2">{rev.admin || '—'}</td>
                    <td className="px-4 py-2 max-w-[320px] break-words text-muted-foreground">{rev.comment || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t grid grid-cols-3 items-center text-sm">
          <div className="justify-self-start">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
          <div className="justify-self-center text-xs text-muted-foreground">Page {currentPage} of {totalPages}</div>
          <div className="justify-self-end">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevisionDocuments;
