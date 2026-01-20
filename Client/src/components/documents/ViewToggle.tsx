import React from 'react';
import { Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ViewToggle: React.FC = () => {
  // Accordion view removed — show a static Table indicator only
  return (
    <div className="inline-flex items-center rounded-xl bg-muted/80 p-1.5 shadow-md border border-border/30 backdrop-blur-sm">
      <div className="relative z-10 flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold text-primary-foreground">
        <Table2 className="h-4 w-4 scale-110 text-primary-foreground" />
        <span>Table</span>
      </div>
    </div>
  );
};

export default ViewToggle;
