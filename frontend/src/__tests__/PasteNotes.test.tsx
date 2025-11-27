/**
 * PasteNotes.test.tsx
 * 
 * Purpose: Basic rendering test for PasteNotes component
 * Ensures the component mounts and displays expected UI elements
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PasteNotes from '../pages/PasteNotes';

describe('PasteNotes', () => {
  it('renders the page with textarea and extract button', () => {
    render(
      <BrowserRouter>
        <PasteNotes />
      </BrowserRouter>
    );

    // Check for heading
    expect(screen.getByText(/Extract Tasks from Meeting Notes/i)).toBeDefined();

    // Check for textarea
    const textarea = screen.getByTestId('notes-textarea');
    expect(textarea).toBeDefined();

    // Check for extract button
    const extractButton = screen.getByTestId('extract-button');
    expect(extractButton).toBeDefined();
  });
});
