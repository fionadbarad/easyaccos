'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { reportError } from '@/lib/monitor'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportError('ErrorBoundary', error, {
      componentStack: errorInfo.componentStack,
    })
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-8 text-center bg-sa-black text-sa-white min-h-[200px] flex flex-col items-center justify-center border border-sa-border rounded-[8px] m-4">
            <h2 className="text-title mb-2">Something went wrong</h2>
            <p className="text-sa-muted text-body mb-6">
              An unexpected error occurred. We&apos;ve been notified and are looking into it.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="bg-sa-white text-sa-black border-none px-4 py-2 rounded-[4px] text-body font-semibold cursor-pointer"
            >
              Try again
            </button>
          </div>
        )
      )
    }

    return this.props.children
  }
}
