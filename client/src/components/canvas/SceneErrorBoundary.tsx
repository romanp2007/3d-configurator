/**
 * Error Boundary для 3D-сцены
 * Перехватывает крэши внутри <Canvas> и показывает fallback UI
 */

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SceneErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[SceneErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 text-white gap-4 p-8">
          <div className="text-5xl">⚠</div>
          <h2 className="text-xl font-semibold">Ошибка рендера 3D-сцены</h2>
          <p className="text-gray-400 text-sm text-center max-w-sm">
            {this.state.error?.message ?? 'Произошла неизвестная ошибка при рендеринге.'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
