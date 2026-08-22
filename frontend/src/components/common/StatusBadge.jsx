import React from 'react';
import { STATUS_STYLES } from '../../utils/constants';

export default function StatusBadge({ status }) {
  const norm = (status || 'SUCCESS').toUpperCase();
  const cls = STATUS_STYLES[norm] || STATUS_STYLES.PENDING;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${cls}`}>
      {norm}
    </span>
  );
}
