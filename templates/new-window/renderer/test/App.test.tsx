import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../src/App';

describe('app Component', () => {
  it('renders the application', () => {
    render(<App />);

    // Check if the main heading is present
    expect(screen.getByText('Window')).toBeInTheDocument();
  });
});
