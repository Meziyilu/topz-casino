'use client';

import { Component, ReactNode } from 'react';

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; msg?: string };

export default class ClientErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: unknown): State {
    return { hasError: true, msg: err instanceof Error ? err.message : String(err) };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // 你也可以送到自家 logger
    console.error('[Feed ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="feed-card" style={{ color: '#fff' }}>
          <div className="title">社交動態載入失敗</div>
          <div style={{ opacity: .8, marginTop: 6, fontSize: 14 }}>
            {this.state.msg ?? '發生未預期的錯誤。請重新整理或稍後再試。'}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
