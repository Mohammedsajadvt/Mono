import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function Toast({ toast }) {
  if (!toast || !toast.message) return null;

  return (
    <div className={`toast-notification ${toast.type || 'success'}`}>
      {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
      <span>{toast.message}</span>
    </div>
  );
}

