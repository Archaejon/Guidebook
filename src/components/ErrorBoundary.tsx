import React from 'react';
import { loadProject } from '../lib/storage';
import { downloadJsonBackup } from '../lib/exports';
import { Icon } from './Icon';

type ExportState = 'idle' | 'working' | 'exported' | 'empty' | 'failed';

interface State {
  error: Error | null;
  exportState: ExportState;
}

/**
 * The last line of defence. Nothing above this boundary catches a render error,
 * so a single throw would unmount the whole tree and leave a blank page — with
 * the project still sitting in IndexedDB and no navigation left to reach
 * Settings or export it. The fallback therefore does two things in this order:
 * get the data out as a normal, re-importable JSON backup, then let the user
 * reload.
 *
 * It is a class because React only offers `componentDidCatch` there.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, exportState: 'idle' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Keep the detail in the console for a bug report; the UI shows the message.
    console.error('Guidebook crashed while rendering:', error, info.componentStack);
  }

  private reload = () => {
    window.location.reload();
  };

  private exportBackup = async () => {
    this.setState({ exportState: 'working' });
    try {
      const project = await loadProject();
      if (!project) {
        this.setState({ exportState: 'empty' });
        return;
      }
      downloadJsonBackup(project);
      this.setState({ exportState: 'exported' });
    } catch {
      this.setState({ exportState: 'failed' });
    }
  };

  render() {
    const { error, exportState } = this.state;
    if (!error) return this.props.children;

    const status =
      exportState === 'exported'
        ? 'Backup downloaded. Keep that file — it can be imported on the Settings page.'
        : exportState === 'empty'
          ? 'No stored project was found in this browser, so there is nothing to export.'
          : exportState === 'failed'
            ? 'The backup could not be built. Reloading may restore the page; if it does not, the stored data is still in this browser.'
            : '';

    return (
      <div className="crash-screen" role="alert">
        <div className="crash-card">
          <p className="eyebrow">Recovery</p>
          <h1>This page stopped drawing</h1>
          <p>
            A part of the interface threw an error. Your project has not been deleted — it is
            still stored in this browser — but the screen that would normally let you reach it
            cannot render. Download a backup first, then reload.
          </p>
          <div className="crash-actions">
            <button className="button primary" onClick={() => void this.exportBackup()} disabled={exportState === 'working'}>
              <Icon name="download" size={15} />
              {exportState === 'working' ? 'Building backup…' : 'Download a JSON backup'}
            </button>
            <button className="button ghost" onClick={this.reload}>
              <Icon name="undo" size={15} />
              Reload the app
            </button>
          </div>
          {status ? (
            <p className="crash-status" role="status">
              {status}
            </p>
          ) : null}
          <p className="crash-note">
            A JSON backup can be imported again under <strong>Settings → Import a backup</strong>{' '}
            once the app opens. If the page keeps failing after a reload, the stored project is
            intact; the fault is in rendering it, and a backup plus a bug report is the safe way
            out.
          </p>
          <details className="crash-detail">
            <summary>Technical detail</summary>
            <pre>{error.message || String(error)}</pre>
          </details>
        </div>
      </div>
    );
  }
}
