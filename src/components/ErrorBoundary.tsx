import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="app-card border-red-200 p-6 text-center dark:border-red-500/20">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10">
            <AlertTriangle size={28} className="text-red-500" />
          </span>
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Something went wrong</h3>
          <p className="mx-auto mb-4 max-w-md text-xs leading-relaxed text-red-600 dark:text-red-400/80 font-mono">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={this.handleReset}
            className="app-btn app-btn-danger"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
