import React from 'react';
import { Alert } from '@mui/material';

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
        <Alert severity="error">
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
