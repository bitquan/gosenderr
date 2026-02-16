/* @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '../../src/routes/ProtectedRoute';

const useAuthMock = vi.fn();

vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../../src/utils/debugLogger', () => ({
  debugLogger: {
    log: vi.fn(),
  },
}));

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Dashboard page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('shows loading state while auth is loading', () => {
    useAuthMock.mockReturnValue({ user: null, loading: true });
    const { container } = renderRoute();

    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('redirects unauthenticated users to login', () => {
    useAuthMock.mockReturnValue({ user: null, loading: false });
    renderRoute();

    expect(screen.getByText('Login page')).toBeTruthy();
  });

  it('renders child route for authenticated users', () => {
    useAuthMock.mockReturnValue({ user: { uid: 'courier-1' }, loading: false });
    renderRoute();

    expect(screen.getByText('Dashboard page')).toBeTruthy();
  });
});
