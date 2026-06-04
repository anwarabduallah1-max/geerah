import { Component, ErrorInfo, ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-3">
            <div className="text-4xl">😵</div>
            <h2 className="text-lg font-bold">حدث خطأ غير متوقع</h2>
            <p className="text-xs text-muted-foreground max-w-xs break-words">
              {this.state.error?.message || "تعذّر عرض هذه الصفحة"}
            </p>
            <button
              onClick={this.reset}
              className="mt-2 px-4 py-2 rounded-2xl bg-primary text-primary-foreground text-sm font-bold active:scale-[0.97]"
            >
              إعادة المحاولة
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
