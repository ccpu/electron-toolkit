import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../src/App';

describe('app Component', () => {
  it('renders the application', () => {
    render(<App />);

    // Check if the main heading is present
    expect(screen.getByText('Electron Vite Monorepo Template')).toBeInTheDocument();

    // Check if Vite + React text is present
    expect(screen.getByText('Vite + React')).toBeInTheDocument();

    // Check if the count button is present
    expect(screen.getByRole('button', { name: /count is/iu })).toBeInTheDocument();
  });

  it('increments counter when clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    const button = screen.getByRole('button', { name: /count is 0/iu });

    await user.click(button);

    expect(screen.getByRole('button', { name: /count is 1/iu })).toBeInTheDocument();
  });
});
