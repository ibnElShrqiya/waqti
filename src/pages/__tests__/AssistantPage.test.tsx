import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AssistantPage } from '../AssistantPage';

describe('AssistantPage', () => {
  it('renders Rafiq AI chat, privacy toggles, suggested prompts, and server-side notice in demo mode', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AssistantPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Rafiq AI' })).toBeInTheDocument();
    expect(screen.getByText(/Server-side AI configuration required/i)).toBeInTheDocument();
    expect(screen.getByText(/Summarize my schedule and priorities for today/i)).toBeInTheDocument();
  });
});
