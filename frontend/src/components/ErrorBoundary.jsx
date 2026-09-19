import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturó un error en la vista:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto my-12 rounded-2xl bg-slate-900/90 border border-rose-500/30 text-slate-200 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-3 text-rose-400 mb-4">
            <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Error al cargar esta sección</h2>
              <p className="text-xs text-rose-300/80">Ocurrió un error inesperado al renderizar la vista.</p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-mono text-rose-300 mb-5 overflow-x-auto">
            {this.state.error?.toString() || 'Error desconocido'}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all border border-slate-700"
            >
              Recargar Página Completa
            </button>

            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reintentar Sección</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
