import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-dvh items-center justify-center bg-background p-4">
          <div className="max-w-md rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
            <h1 className="mb-2 text-2xl font-bold text-destructive">Đã có lỗi xảy ra</h1>
            <p className="mb-4 text-muted-foreground">
              Ứng dụng gặp sự cố. Vui lòng tải lại trang hoặc liên hệ hỗ trợ.
            </p>
            {this.state.error && (
              <details className="mt-4 rounded bg-background p-4 text-left">
                <summary className="cursor-pointer font-medium">Chi tiết lỗi</summary>
                <pre className="mt-2 overflow-auto text-sm text-destructive">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-destructive px-4 py-2 text-white hover:bg-destructive/90"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
