import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('BatchVerse ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F6F4EF] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200 shadow-lg p-6 text-center space-y-4">
            <h1
              className="text-xl font-semibold text-stone-900"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Something went wrong
            </h1>
            <p className="text-sm text-stone-600 leading-relaxed">
              We hit a snag connecting to the classroom. Reloading usually clears it right up.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 text-sm font-semibold bg-[#1E3A2F] hover:bg-[#162C23] text-amber-50 rounded-lg cursor-pointer"
            >
              Reload Classroom
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
