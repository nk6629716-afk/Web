import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Header } from '../Header';

describe('Header & Save Workflow Button Regression Tests', () => {
  const defaultProps = {
    workflowTitle: 'Test Workflow',
    onTitleChange: vi.fn(),
    revision: 1,
    isDirty: false,
    isRunning: false,
    collaborators: [],
    onRun: vi.fn(),
    onResetSample: vi.fn(),
    onValidate: vi.fn(),
    onClear: vi.fn(),
    onSave: vi.fn(),
    isSaving: false,
    saveStatus: 'idle' as const,
    currentView: 'studio' as const,
  };

  it('renders a clearly visible "Save Workflow" button in the top toolbar', () => {
    const html = renderToStaticMarkup(<Header {...defaultProps} />);
    expect(html).toContain('data-testid="save-workflow-button"');
    expect(html).toContain('aria-label="Save Workflow"');
    expect(html).toContain('Save Workflow');
  });

  it('maintains button visibility on mobile and desktop without responsive hiding', () => {
    const html = renderToStaticMarkup(<Header {...defaultProps} />);
    const buttonMatch = html.match(/<button[^>]*data-testid="save-workflow-button"[^>]*>/);
    expect(buttonMatch).not.toBeNull();
    const buttonTag = buttonMatch![0];
    expect(buttonTag).toContain('shrink-0');
    expect(buttonTag).not.toMatch(/class="[^"]*\bhidden\b/);
  });

  it('shows "Saving..." and disables the button while isSaving is true', () => {
    const html = renderToStaticMarkup(<Header {...defaultProps} isSaving={true} saveStatus="saving" />);
    expect(html).toContain('Saving...');
    const buttonMatch = html.match(/<button[^>]*data-testid="save-workflow-button"[^>]*>/);
    expect(buttonMatch![0]).toContain('disabled=""');
  });

  it('is enabled and clickable when isSaving is false for new and clean workflows', () => {
    const html = renderToStaticMarkup(<Header {...defaultProps} isSaving={false} isDirty={false} />);
    const buttonMatch = html.match(/<button[^>]*data-testid="save-workflow-button"[^>]*>/);
    expect(buttonMatch![0]).not.toContain('disabled=""');
  });

  it('shows "Saved" status feedback when saveStatus is saved', () => {
    const html = renderToStaticMarkup(<Header {...defaultProps} saveStatus="saved" />);
    expect(html).toContain('Saved');
  });

  it('shows "Retry Save" status feedback when saveStatus is failed', () => {
    const html = renderToStaticMarkup(<Header {...defaultProps} saveStatus="failed" />);
    expect(html).toContain('Retry Save');
  });

  it('invokes the onSave handler when the button onClick handler is triggered', () => {
    const onSave = vi.fn();
    const element = <Header {...defaultProps} onSave={onSave} />;
    expect(element.props.onSave).toBe(onSave);
    element.props.onSave();
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
