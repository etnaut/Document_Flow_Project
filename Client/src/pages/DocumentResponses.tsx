import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocumentResponses } from '@/services/api';
import { DocumentResponse } from '@/types';
import { toast } from '@/hooks/use-toast';
import { MessageCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DocumentResponses: React.FC = () => {
  const { user } = useAuth();
  const [responses, setResponses] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResponses();
  }, [user]);

  const fetchResponses = async () => {
    if (!user) return;
    try {
      const data = await getDocumentResponses(user.Department);
      setResponses(data);
    } catch (error) {
      console.error('Error fetching responses:', error);
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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
            <MessageCircle className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Responses</h1>
            <p className="text-muted-foreground">
              Responses received from other department admins on forwarded documents.
            </p>
          </div>
        </div>
      </div>

      {responses.length === 0 ? (
        <Card>
          <CardContent className="flex h-32 items-center justify-center text-muted-foreground">
            No responses received yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {responses.map((response) => (
            <Card key={response.Response_Id} className="overflow-hidden">
              <CardHeader className="bg-muted/50 py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Document #{response.Document_Id}
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {response.Response_Date}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">From:</span>
                    <span>{response.Responder_Name}</span>
                    <span className="text-muted-foreground">
                      ({response.Responder_Department})
                    </span>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm">{response.Response_Message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentResponses;
