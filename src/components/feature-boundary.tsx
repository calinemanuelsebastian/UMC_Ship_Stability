import { Component, type ReactNode } from 'react';
export class FeatureBoundary extends Component<{children: ReactNode; message: string; retryLabel: string; detailsLabel: string; onRetry?: () => void}, {error?: string}> {
  state: {error?: string} = {};
  static getDerivedStateFromError(error: unknown) { return {error: error instanceof Error ? error.message : String(error)}; }
  render() {
    if (!this.state.error) return this.props.children;
    return <section className="panel" role="alert"><h2>{this.props.message}</h2><button onClick={() => {this.props.onRetry?.(); this.setState({error: undefined});}}>{this.props.retryLabel}</button><details><summary>{this.props.detailsLabel}</summary><p>{this.state.error}</p></details></section>;
  }
}
