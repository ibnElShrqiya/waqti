import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { usePreferences } from '@/stores/preferences';
import { SpiritualPage } from '../SpiritualPage';

function renderSpiritual() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SpiritualPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SpiritualPage', () => {
  it('shows opt-in screen when disabled and renders trackers when enabled', () => {
    usePreferences.setState({ spiritualEnabled: false });
    const { rerender } = renderSpiritual();
    expect(screen.getByText(/Spiritual Life is currently turned off/i)).toBeInTheDocument();

    usePreferences.setState({ spiritualEnabled: true });
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <SpiritualPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText('Quran reading tracker')).toBeInTheDocument();
    expect(screen.getByText('Prayer checklist')).toBeInTheDocument();
    expect(screen.getByText('Azkar tracker')).toBeInTheDocument();
  });
});
