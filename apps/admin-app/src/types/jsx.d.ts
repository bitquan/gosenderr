import * as React from 'react'

declare global {
  namespace JSX {
    // Ensure JSX namespace is available and maps to React's JSX types
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
    interface Element extends React.ReactElement<any, any> {}
  }
}
export {}
