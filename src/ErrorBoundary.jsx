import React from 'react';
import { Alert, Button } from '@mui/material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <Alert
          severity="error"
          // This alert replaces the whole app, including the component that
          // offers the "update available" refresh. Without a way back, a
          // client that crashes on a stale build can never recover itself.
          action={
            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
              Reload
            </Button>
          }
        >
          {/* Wrap rather than 'pre': on a phone an unwrapped stack runs off
              the side of the screen and the alert looks empty. */}
          <code style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{error.stack}</code>
        </Alert>
      );
    }
    const { children } = this.props;
    return children;
  }
}

export default ErrorBoundary;
