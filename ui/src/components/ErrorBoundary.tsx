import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-red-400">
          <p className="font-medium">Something went wrong.</p>
          <p className="text-sm text-slate-500">{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
