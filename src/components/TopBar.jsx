// Edit the workspace title and connection status here.
import React from 'react';

export default function TopBar({ title, configured }) {
  let connectionText = 'SAMPLE MODE';
  if (configured) {
    connectionText = 'SUPABASE CONNECTED';
  }

  return (
    <header className="workspace-header">
      <div>
        Workspace <span>/</span>{' '}
        <b>{title}</b>
      </div>

      <span className="connection-status">
        <span className="connection-status-dot" />
        {connectionText}
      </span>
    </header>
  );
}
