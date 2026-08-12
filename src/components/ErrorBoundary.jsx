import { Component } from 'react'

// Catches render errors below it, showing a recoverable message instead of a blank screen.
// Must be a class component — no hook equivalent for getDerivedStateFromError/componentDidCatch.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('HomeVision crashed:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          fontFamily: 'sans-serif',
          color: '#111',
          background: '#fff',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700 }}>Something went wrong</div>
        <div style={{ fontSize: 13, color: '#767676', maxWidth: 420 }}>
          {this.state.error.message ?? String(this.state.error)}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: '1px solid #0058A3',
              background: '#fff',
              color: '#0058A3',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: '1px solid #767676',
              background: '#fff',
              color: '#767676',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    )
  }
}
