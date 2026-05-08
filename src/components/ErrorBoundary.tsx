import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error?: Error;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("BosscheGuessr frontend crashed", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="screen centered">
        <section className="panel maps-error-panel">
          <p className="eyebrow">Frontend crash</p>
          <h1>BosscheGuessr hit a startup error</h1>
          <p>
            The page loaded, but the React app crashed before it could render. Check the browser console for the full
            stack trace.
          </p>
          <div className="maps-error-grid">
            <div>
              <strong>Detected issue</strong>
              <span>{this.state.error.message}</span>
            </div>
            <div>
              <strong>Quick fix</strong>
              <span>Stop the launcher, run npm run launch again, and share the browser console error if it repeats.</span>
            </div>
          </div>
        </section>
      </main>
    );
  }
}
