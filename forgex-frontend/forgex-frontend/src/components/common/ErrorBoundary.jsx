import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error(error, info); // eslint-disable-line no-console
  }

  render() {
    if (!this.state.error) return this.props.children;
    const chunkFailed = /Loading chunk|dynamically imported module/i.test(String(this.state.error?.message));
    return (
      <div className="page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <h1 className="text-3xl">{chunkFailed ? 'A new version is available' : 'Something went wrong'}</h1>
        <p className="mt-2 max-w-md text-steel">
          {chunkFailed ? 'Reload the page to get the latest version of the store.' : 'Reload the page to try again. If it keeps happening, come back in a few minutes.'}
        </p>
        <button type="button" className="btn-primary mt-6" onClick={() => window.location.reload()}>Reload page</button>
      </div>
    );
  }
}
