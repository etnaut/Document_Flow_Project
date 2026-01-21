<<<<<<< HEAD
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
  // Optional passthrough for priority suffix behavior
  prioritySuffix?: (doc: Document) => string | undefined;
  // Optional handler to mark a release as done
  onMarkRelease?: (recordDocId: number, mark?: 'done' | 'not_done') => Promise<void> | void;
}

const DocumentViewToggle: React.FC<DocumentViewToggleProps> = ({
  documents,
  ...props
}) => {
  const commonProps = {
    documents,
    ...props,
  };

  // Accordion view removed: always render table
  return (
    <div className="relative overflow-hidden">
      <div className="animate-fade-in">
        <DocumentTable {...commonProps} />
      </div>
    </div>
  );
};

export default DocumentViewToggle;
            variant={viewMode === 'accordion' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('accordion')}
            className="h-8 px-3"
          >
            <LayoutGrid className="h-4 w-4 mr-1.5" />
            Cards
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="h-8 px-3"
          >
            <Table2 className="h-4 w-4 mr-1.5" />
            Table
          </Button>
        </div>
      </div>

      {/* Render Selected View */}
      {viewMode === 'accordion' ? (
        <DocumentAccordion {...commonProps} />
      ) : (
        <DocumentTable {...commonProps} />
      )}
=======
      {/* Accordion view removed: always render table */}
      <div className="relative overflow-hidden">
        <div className="animate-fade-in">
          <DocumentTable {...commonProps} />
        </div>
      </div>
>>>>>>> 14358356059b01645918b43587691d6bc6cf2e43
    </div>
  );
};

<<<<<<< HEAD
=======
// Export the toggle element for use in headers
export { DocumentViewToggle };
>>>>>>> 14358356059b01645918b43587691d6bc6cf2e43
export default DocumentViewToggle;
