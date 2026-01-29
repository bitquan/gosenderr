// Test helpers for mocking Firestore onSnapshot behavior in unit tests

export function mockOnSnapshotForDoc(cb: any, runDocData: any = { created: { users: [], items: [], jobs: [] } }) {
  return (q: any, listener: any) => {
    // If a doc-like ref is observed, provide a DocumentSnapshot-like object
    if (q && (q.id === 'run1' || q?.__runDocMock)) {
      listener({ id: 'run1', data: () => runDocData })
      return () => {}
    }

    // Fallback: provide a query snapshot with a single entry
    listener({ docs: [ { id: 'e1', data: () => ({ message: 'Created buyer' }) } ] })
    return () => {}
  }
}

export function mockOnSnapshotForQuery(cb: any, docs: any[] = []) {
  return (q: any, listener: any) => {
    listener({ docs: docs.length ? docs : [ { id: 'e1', data: () => ({ message: 'Created buyer' }) } ] })
    return () => {}
  }
}
