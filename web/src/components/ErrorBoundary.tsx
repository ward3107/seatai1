import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Short label shown in the error panel, e.g. "Seating Grid" */
  name?: string;
  /** Replace the whole panel with a minimal inline message instead */
  inline?: boolean;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log to console; swap for a real error-reporting service later
    console.error(`[ErrorBoundary: ${this.props.name ?? 'unknown'}]`, error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    const { children, name, inline } = this.props;

    if (!error) return children;

    if (inline) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          <AlertTriangle size={14} />
          <span>{name ?? 'Component'} failed to render.</span>
          <button
            onClick={this.reset}
            className="ml-auto underline hover:no-underline text-red-500"
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 bg-red-50 border border-red-200 rounded-2xl text-center">
        <AlertTriangle size={32} className="text-red-400" />
        <div>
          <p className="font-semibold text-red-700 text-lg">
            {name ? `${name} crashed` : 'Something went wrong'}
          </p>
          <p className="text-red-500 text-sm mt-1 max-w-xs">
            {error.message || 'An unexpected error occurred.'}
          </p>
        </div>
        <button
          onClick={this.reset}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          <RefreshCw size={16} />
          Try again
        </button>
        <details className="text-left w-full max-w-sm">
          <summary className="text-xs text-red-400 cursor-pointer">Details</summary>
          <pre className="mt-1 text-xs text-red-400 overflow-auto max-h-32 bg-white rounded p-2 border border-red-100">
            {error.stack}
          </pre>
        </details>
      </div>
    );
  }
}
