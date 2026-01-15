import React, { useState } from 'react';
import { Document } from '@/types';
import DocumentTable from './DocumentTable';
import DocumentAccordion from './DocumentAccordion';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Table2 } from 'lucide-react';

interface DocumentViewToggleProps {
  documents: Document[];
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
  defaultView?: 'table' | 'accordion';
}

const DocumentViewToggle: React.FC<DocumentViewToggleProps> = ({
  defaultView = 'accordion',
  ...props
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'accordion'>(defaultView);

  const commonProps = {
    documents: props.documents,
    onApprove: props.onApprove,
    onReject: props.onReject,
    onRevision: props.onRevision,
    onRelease: props.onRelease,
    onRecord: props.onRecord,
    onForward: props.onForward,
    onView: props.onView,
    onEdit: props.onEdit,
    onDelete: props.onDelete,
    onTrack: props.onTrack,
    renderActions: props.renderActions,
    showPriority: props.showPriority,
    showDescription: props.showDescription,
    showDate: props.showDate,
    descriptionLabel: props.descriptionLabel,
    enablePagination: props.enablePagination,
    pageSizeOptions: props.pageSizeOptions,
    showStatusFilter: props.showStatusFilter,
  };

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-1 rounded-lg border p-1 bg-muted/30">
          <Button
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
    </div>
  );
};

export default DocumentViewToggle;
