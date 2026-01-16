import React, { useRef, useEffect, useState } from 'react';
import { LayoutGrid, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewToggleProps {
  view: 'table' | 'accordion';
  onViewChange: (view: 'table' | 'accordion') => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ view, onViewChange }) => {
  const tableButtonRef = useRef<HTMLButtonElement>(null);
  const accordionButtonRef = useRef<HTMLButtonElement>(null);
  const [sliderStyle, setSliderStyle] = useState({ width: 0, left: 0 });

  // Update slider position and size based on active button
  useEffect(() => {
    const activeButton = view === 'table' ? tableButtonRef.current : accordionButtonRef.current;
    const container = activeButton?.parentElement;
    
    if (activeButton && container) {
      const buttonRect = activeButton.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      setSliderStyle({
        width: buttonRect.width,
        left: buttonRect.left - containerRect.left,
      });
    }
  }, [view]);

  return (
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
        onClick={() => onViewChange('table')}
        className={cn(
          "relative z-10 flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-all duration-300",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
          "active:scale-95",
          view === 'table'
            ? "text-primary-foreground"
            : "text-muted-foreground hover:text-foreground/80"
        )}
        aria-label="Table view"
        aria-pressed={view === 'table'}
      >
        <Table2 className={cn(
          "h-4 w-4 transition-all duration-300",
          view === 'table' 
            ? "scale-110 text-primary-foreground" 
            : "scale-100"
        )} />
        <span className={cn(
          "transition-all duration-300",
          view === 'table' && "text-primary-foreground"
        )}>Table</span>
      </button>

      {/* Accordion Button */}
      <button
        ref={accordionButtonRef}
        onClick={() => onViewChange('accordion')}
        className={cn(
          "relative z-10 flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-all duration-300",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
          "active:scale-95",
          view === 'accordion'
            ? "text-primary-foreground"
            : "text-muted-foreground hover:text-foreground/80"
        )}
        aria-label="Accordion view"
        aria-pressed={view === 'accordion'}
      >
        <LayoutGrid className={cn(
          "h-4 w-4 transition-all duration-300",
          view === 'accordion' 
            ? "scale-110 text-primary-foreground" 
            : "scale-100"
        )} />
        <span className={cn(
          "transition-all duration-300",
          view === 'accordion' && "text-primary-foreground"
        )}>Accordion</span>
      </button>
    </div>
  );
};

export default ViewToggle;
