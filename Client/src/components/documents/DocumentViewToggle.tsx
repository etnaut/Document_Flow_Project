import React from 'react';
import DocumentTable from './DocumentTable';
import { Document } from '@/types';

interface DocumentViewToggleProps {
  documents: Document[];
  renderToggleInHeader?: boolean;
  // Pass through all DocumentTable props
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onRevision?: (id: number, comment?: string) => void;
  onRelease?: (id: number) => void;
  onRecord?: (doc: Document) => void;
  onForward?: (doc: Document) => void;
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

const DocumentViewToggle: React.FC<DocumentViewToggleProps> = ({
  documents,
  ...props
}) => {
  const commonProps = {
    documents,
    ...props,
  };

  return (
    <div className="space-y-4">
      {/* Accordion view removed: always render table */}
      <div className="relative overflow-hidden">
        <div className="animate-fade-in">
          <DocumentTable {...commonProps} />
        </div>
      </div>
    </div>
  );
};

// Export the toggle element for use in headers
export { DocumentViewToggle };
export default DocumentViewToggle;
