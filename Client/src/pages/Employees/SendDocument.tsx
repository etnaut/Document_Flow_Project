import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { createDocument } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Send, FileText, Upload, Calendar, ArrowDown, ArrowUp, Building2, X, Cloud } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    otherType: '',
    priority: 'Medium',
    description: '',
    date: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileAcceptTypes = [
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.csv',
    '.ppt',
    '.pptx',
    '.txt',
    '.rtf',
    '.odt',
    '.ods',
    '.odp',
  ].join(',');

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result?.toString() || '';
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });

  const handleFileSelect = (file: File | null) => {
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const formatDate = (date: Date): string => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, date: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const resolvedType = (formData.type === 'Other' ? formData.otherType : formData.type).trim();

    if (!resolvedType) {
      toast({
        title: 'Validation Error',
        description: 'Please select or enter a document type.',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.User_Id) {
      toast({
        title: 'User not found',
        description: 'Your session is missing user information. Please log in again.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const documentFile = selectedFile ? await fileToBase64(selectedFile) : undefined;

      // Use the description field as the submitted content
      const fullDescription = formData.description.trim();

      await createDocument({
        Type: resolvedType,
        Priority: formData.priority,
        User_Id: user?.User_Id,
        sender_name: user?.Full_Name,
        sender_department: user?.Department,
        description: fullDescription || undefined,
        Document: documentFile,
      });

      toast({
        title: 'Success',
        description: 'Your document has been submitted for review.',
      });

      navigate('/my-documents');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit document. Please try again.';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#f6f2ee' }}>
      {/* Header - Outside cards */}
      <div className="mb-6 animate-slide-up">
        <h1 className="text-3xl font-bold text-foreground">Send Document</h1>
        <p className="mt-1 text-muted-foreground">
          Submit a new document request for admin review.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column - Communication Details (2/3 width) */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Communication Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Kind of Communication */}
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-sm font-medium">
                    Kind of Communication<span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        type: value,
                        otherType: value === 'Other' ? formData.otherType : '',
                      })
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select communication type..." />
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

                {formData.type === 'Other' && (
                  <div className="space-y-2">
                    <Label htmlFor="otherType" className="text-sm font-medium">
                      Specify Type<span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      id="otherType"
                      placeholder="Enter document type"
                      value={formData.otherType}
                      onChange={(e) => setFormData({ ...formData, otherType: e.target.value })}
                      className="h-10"
                    />
                  </div>
                )}

                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-medium">
                    Date<span className="text-red-500 ml-1">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={handleDateChange}
                      className="h-10 pl-10"
                    />
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Communication Details (used as the main content) */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Communication Details<span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Enter detailed information about the communication..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={6}
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Personnel & Assignment, Priority (1/3 width) */}
          <div className="space-y-6">
            {/* Personnel & Assignment */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Personnel & Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sender Information</Label>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{user?.Full_Name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Department:</span>
                      <span className="font-medium">{user?.Department}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Division:</span>
                      <span className="font-medium">{user?.Division}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Priority Level */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Priority Level<span className="text-red-500 ml-1">*</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="High" id="priority-high" />
                    <Label htmlFor="priority-high" className="font-normal cursor-pointer flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-red-500"></span>
                      High
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Medium" id="priority-medium" />
                    <Label htmlFor="priority-medium" className="font-normal cursor-pointer flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-orange-500"></span>
                      Medium
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Low" id="priority-low" />
                    <Label htmlFor="priority-low" className="font-normal cursor-pointer flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-green-500"></span>
                      Low
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Attachments Section - Full Width */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={fileAcceptTypes}
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                className="hidden"
              />
              {selectedFile ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="text-left">
                      <p className="font-medium text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change File
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Cloud className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Drag and drop files here, or{' '}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-primary hover:underline font-medium"
                      >
                        browse
                      </button>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports: PDF, Word, Excel, Images, etc.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
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
  );
};

export default SendDocument;
