'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { reportError } from '@/lib/monitor'
import { C } from '@/styles/palette'

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
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              background: C.bg,
              color: C.white,
              minHeight: '200px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${C.border}`,
              borderRadius: '8px',
              margin: '1rem',
            }}
          >
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Something went wrong</h2>
            <p style={{ color: C.muted, fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              An unexpected error occurred. We've been notified and are looking into it.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              style={{
                background: C.white,
                color: C.bg,
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        )
      )
    }

    return this.children
  }
}
