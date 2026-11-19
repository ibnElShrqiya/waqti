import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TasksPage } from '../TasksPage';

function renderTasksPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TasksPage', () => {
  it('renders task list, supports search filtering, and switches to calendar view', async () => {
    const user = userEvent.setup();
    renderTasksPage();

    expect(await screen.findByText('Write the project proposal')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Search tasks/i);
    await user.type(searchInput, 'electricity');
    expect(screen.getByText('Pay the electricity bill')).toBeInTheDocument();
    expect(screen.queryByText('Write the project proposal')).not.toBeInTheDocument();

    await user.clear(searchInput);
    await user.click(screen.getByRole('radio', { name: /Calendar/i }));
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
  });
});
