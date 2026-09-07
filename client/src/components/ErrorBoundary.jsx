import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <span className="error-boundary-icon">⚠️</span>
            <h2>Something went wrong</h2>
            <p>An unexpected error occurred. Please try again.</p>
            <div className="error-boundary-actions">
              <button className="primary-btn" onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}>
                Try Again
              </button>
              <button className="ghost-btn" onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = "/"; }}>
                Go to Home
              </button>
            </div>
            {this.state.error && (
              <details className="error-boundary-details">
                <summary>Error Details</summary>
                <pre>{this.state.error.message}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
