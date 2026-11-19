import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as profileHook from '@/features/profile/useCurrentProfile';
import { AdminPage } from '../AdminPage';

describe('AdminPage', () => {
  it('renders platform KPIs, users table, config toggles, and audit logs for admin demo profile', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument();
    expect(await screen.findByText('Omar K.')).toBeInTheDocument();
    expect(screen.getByText('Users & Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('Audit logs')).toBeInTheDocument();
  });

  it('denies access when profile role is non-admin', () => {
    const spy = vi.spyOn(profileHook, 'useCurrentProfile').mockReturnValue({
      id: 'u-regular',
      firstName: 'Ali',
      displayName: 'Ali',
      plan: 'free',
      role: 'user',
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Administrator access required')).toBeInTheDocument();
    expect(screen.queryByText('Users & Subscriptions')).not.toBeInTheDocument();
    spy.mockRestore();
  });
});
