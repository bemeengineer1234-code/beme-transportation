import React from 'react';
import { ApplicationStatus } from '../types';
import { cn } from '../lib/utils';

interface StatusBadgeProps {
  status: ApplicationStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = {
    pending: { label: '申請中', classes: 'bg-amber-50 text-amber-600 border-amber-100' },
    approved: { label: '承認済み', classes: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    returned: { label: '差し戻し', classes: 'bg-rose-50 text-rose-600 border-rose-100' },
  };

  const { label, classes } = config[status];

  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
      classes,
      className
    )}>
      {label}
    </span>
  );
};
