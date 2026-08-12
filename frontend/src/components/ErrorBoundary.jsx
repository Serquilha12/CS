import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[React ErrorBoundary caught error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Ocorreu um erro inesperado</h2>
            <p className="text-xs text-slate-500 mb-6">
              Ocorreu uma falha no carregamento da interface. Por favor, recarregue a página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-ucm-emerald text-white rounded-xl text-sm font-bold shadow-md hover:bg-ucm-darkEmerald transition-all"
            >
              Recarregar Aplicação
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
