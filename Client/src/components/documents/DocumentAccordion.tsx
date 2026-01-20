import React from 'react';
import DocumentTable from './DocumentTable';
import { Document } from '@/types';

interface DocumentAccordionProps {
  documents: Document[];
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onRevision?: (id: number, comment?: string) => void;
  onRelease?: (id: number) => void;
  onRecord?: (doc: Document) => void;
  onForward?: (doc: Document, includeNotes?: boolean) => void;
  onView?: (doc: Document) => void;
  onEdit?: (doc: Document) => void;
  onDelete?: (id: number) => void;
  onTrack?: (doc: Document) => void;
  renderActions?: (doc: Document) => React.ReactNode;
  showPriority?: boolean;
  showDescription?: boolean;
  showDate?: boolean;
  descriptionLabel?: string;
  enablePagination?: boolean;
  pageSizeOptions?: number[];
  showStatusFilter?: boolean;
}

// Accordion feature removed  render the table view as a fallback
const DocumentAccordion: React.FC<DocumentAccordionProps> = ({ documents, ...props }) => {
  return <DocumentTable documents={documents} {...props} />;
};

export default DocumentAccordion;
