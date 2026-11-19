import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ReportsPage } from '../ReportsPage';

describe('ReportsPage', () => {
  it('renders analytics KPIs, trend chart, and Pro export gate on Free plan', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ReportsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Reports & Analytics' })).toBeInTheDocument();
    expect(await screen.findByText('Tasks completed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
    expect(screen.getByText(/Unlock Advanced Reports & CSV Export/i)).toBeInTheDocument();
  });
});
