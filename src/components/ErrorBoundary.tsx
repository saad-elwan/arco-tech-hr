"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMsg: ""
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "40px 20px", textAlign: "center", background: "var(--bg-card)",
          borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", margin: "20px 0"
        }}>
          <AlertCircle size={48} color="var(--danger)" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            حدث خطأ غير متوقع في هذا المكون
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24, maxWidth: 400 }}>
            {this.state.errorMsg || "يرجى تحديث الصفحة أو الاتصال بالدعم الفني إذا استمرت المشكلة."}
          </p>
          <button 
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <RefreshCcw size={16} /> تحديث الصفحة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
