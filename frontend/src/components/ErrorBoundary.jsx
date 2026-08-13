import React from 'react';
import { AlertTriangle, RefreshCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[React ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleClearData = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Erro desconhecido na interface.';

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 text-center">
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full space-y-5 animate-in fade-in zoom-in duration-200">
            
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">Ocorreu um erro na interface</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Houve uma falha inesperada durante a renderização da página. Pode tentar recarregar ou limpar os dados locais de sessão.
              </p>
            </div>

            {/* Mensagem direta do erro */}
            <div className="p-3 bg-rose-50/80 border border-rose-200/80 rounded-2xl text-left text-xs text-rose-900 font-medium break-words">
              <strong>Motivo:</strong> {errorMessage}
            </div>

            {/* Botões de Ação */}
            <div className="space-y-2 pt-1">
              <div className="flex space-x-2">
                <button
                  onClick={this.handleReset}
                  className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center cursor-pointer min-h-[44px]"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5 text-ucm-emerald" />
                  Tentar Novamente
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 py-3 px-4 bg-ucm-emerald hover:bg-ucm-darkEmerald text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center cursor-pointer min-h-[44px]"
                >
                  Recarregar Página
                </button>
              </div>

              <button
                onClick={this.handleClearData}
                className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition-colors border border-rose-200 flex items-center justify-center cursor-pointer min-h-[44px]"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Limpar Cache de Sessão e Reiniciar
              </button>
            </div>

            {/* Accordion para Detalhes Técnicos */}
            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 flex items-center justify-center mx-auto"
              >
                <span>{this.state.showDetails ? 'Ocultar Detalhes Técnicos' : 'Ver Detalhes Técnicos do Erro'}</span>
                {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
              </button>

              {this.state.showDetails && (
                <div className="mt-3 p-3 bg-slate-900 text-slate-200 rounded-2xl text-left text-[11px] font-mono overflow-x-auto max-h-40 scrollbar-thin">
                  <p className="text-rose-400 font-bold">{this.state.error?.toString()}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-2 text-[10px] text-slate-400 whitespace-pre-wrap leading-relaxed">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

