import React, { useState, useRef, useEffect } from 'react';
import { LayoutGrid, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import DocumentTable from './DocumentTable';
import DocumentAccordion from './DocumentAccordion';
import { Document } from '@/types';

interface DocumentViewToggleProps {
  documents: Document[];
  view?: 'table' | 'accordion';
  onViewChange?: (view: 'table' | 'accordion') => void;
  renderToggleInHeader?: boolean;
  // Pass through all DocumentTable/DocumentAccordion props
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
  view: controlledView,
  onViewChange,
  renderToggleInHeader = false,
  ...props
}) => {
  const [internalView, setInternalView] = useState<'table' | 'accordion'>('table');
  const tableButtonRef = useRef<HTMLButtonElement>(null);
  const accordionButtonRef = useRef<HTMLButtonElement>(null);
  const [sliderStyle, setSliderStyle] = useState({ width: 0, left: 0 });
  
  const isControlled = controlledView !== undefined;
  const currentView = isControlled ? controlledView : internalView;
  
  const handleViewChange = (newView: 'table' | 'accordion') => {
    if (!isControlled) {
      setInternalView(newView);
    }
    onViewChange?.(newView);
  };

  // Update slider position and size based on active button
  useEffect(() => {
    const activeButton = currentView === 'table' ? tableButtonRef.current : accordionButtonRef.current;
    const container = activeButton?.parentElement;
    
    if (activeButton && container) {
      const buttonRect = activeButton.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      setSliderStyle({
        width: buttonRect.width,
        left: buttonRect.left - containerRect.left,
      });
    }
  }, [currentView]);

  const commonProps = {
    documents,
    ...props,
  };

  const toggleElement = (
    <div className="flex items-center justify-end">
      <div className="relative inline-flex items-center rounded-xl bg-muted/80 p-1.5 shadow-md border border-border/30 backdrop-blur-sm">
        {/* Sliding Background Indicator with smooth animation */}
        <div
          className="absolute h-9 rounded-lg bg-primary transition-all duration-500 ease-out"
          style={{
            width: `${sliderStyle.width}px`,
            left: `${sliderStyle.left}px`,
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
        
        {/* Table Button */}
        <button
          ref={tableButtonRef}
          onClick={() => handleViewChange('table')}
          className={cn(
            "relative z-10 flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-all duration-300",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
            "active:scale-95",
            currentView === 'table'
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground/80"
          )}
          aria-label="Table view"
          aria-pressed={currentView === 'table'}
        >
          <Table2 className={cn(
            "h-4 w-4 transition-all duration-300",
            currentView === 'table' 
              ? "scale-110 text-primary-foreground" 
              : "scale-100"
          )} />
          <span className={cn(
            "transition-all duration-300",
            currentView === 'table' && "text-primary-foreground"
          )}>Table</span>
        </button>

        {/* Accordion Button */}
        <button
          ref={accordionButtonRef}
          onClick={() => handleViewChange('accordion')}
          className={cn(
            "relative z-10 flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-all duration-300",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
            "active:scale-95",
            currentView === 'accordion'
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground/80"
          )}
          aria-label="Accordion view"
          aria-pressed={currentView === 'accordion'}
        >
          <LayoutGrid className={cn(
            "h-4 w-4 transition-all duration-300",
            currentView === 'accordion' 
              ? "scale-110 text-primary-foreground" 
              : "scale-100"
          )} />
          <span className={cn(
            "transition-all duration-300",
            currentView === 'accordion' && "text-primary-foreground"
          )}>Accordion</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Modern Segmented Control Toggle */}
      {!renderToggleInHeader && toggleElement}

      {/* Render the selected view with fade animation */}
      <div className="relative overflow-hidden">
        <div
          key={currentView}
          className="animate-fade-in"
        >
          {currentView === 'table' ? (
            <DocumentTable {...commonProps} />
          ) : (
            <DocumentAccordion {...commonProps} />
          )}
        </div>
      </div>
    </div>
  );
};

// Export the toggle element for use in headers
export { DocumentViewToggle };
export default DocumentViewToggle;
