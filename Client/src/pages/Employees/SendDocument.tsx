import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { createDocument, getDepartments } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Send, FileText } from 'lucide-react';

const documentTypes = [
  'Leave Request',
  'Travel Authorization',
  'Budget Proposal',
  'Equipment Request',
  'Memo',
  'Report',
  'Other',
];

const priorities = ['Low', 'Medium', 'High'];

const SendDocument: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    type: '',
    priority: 'Medium',
    target_department: '',
    description: '',
  });

  useEffect(() => {
    const fetchDepartments = async () => {
      const depts = await getDepartments();
      setDepartments(depts);
    };
    fetchDepartments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.type) {
      toast({
        title: 'Validation Error',
        description: 'Please select a document type.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.target_department) {
      toast({
        title: 'Validation Error',
        description: 'Please select the target department.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await createDocument({
        Type: formData.type,
        Priority: formData.priority,
        User_Id: user?.User_Id,
        sender_name: user?.Full_Name,
        sender_department: user?.Department,
        target_department: formData.target_department,
      });

      toast({
        title: 'Success',
        description: 'Your document has been submitted for review.',
      });

      navigate('/my-documents');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div className="animate-slide-up">
        <h1 className="text-3xl font-bold text-foreground">Send Document</h1>
        <p className="mt-1 text-muted-foreground">
          Submit a new document request for admin review.
        </p>
      </div>

      {/* Form */}
      <div className="animate-fade-in rounded-xl border bg-card p-8 shadow-card">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Document Details</h2>
            <p className="text-sm text-muted-foreground">Fill in the information below</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Document Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_department">Send To Department *</Label>
            <Select
              value={formData.target_department}
              onValueChange={(value) => setFormData({ ...formData, target_department: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The admin of this department will review your document.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description / Notes</Label>
            <Textarea
              id="description"
              placeholder="Add any additional details about your document request..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm font-medium text-muted-foreground">Sender Information</p>
            <div className="mt-2 space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Name:</span>{' '}
                <span className="font-medium text-foreground">{user?.Full_Name}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Division:</span>{' '}
                <span className="font-medium text-foreground">{user?.Division}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Department:</span>{' '}
                <span className="font-medium text-foreground">{user?.Department}</span>
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Submitting...' : 'Submit Document'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendDocument;
