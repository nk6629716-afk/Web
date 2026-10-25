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

  it('shows "Unsaved changes" when isDirty is true', () => {
    const html = renderToStaticMarkup(<Header {...defaultProps} isDirty={true} />);
    expect(html).toContain('Unsaved changes');
  });

  it('renders editable workflow name and revision badge directly next to Save Workflow', () => {
    const html = renderToStaticMarkup(<Header {...defaultProps} workflowTitle="City Traffic Router" revision={4} />);
    expect(html).toContain('value="City Traffic Router"');
    expect(html).toContain('#4');
    expect(html).toContain('data-testid="save-workflow-button"');
  });

  it('renders authenticated user profile button with email', () => {
    const onLogout = vi.fn();
    const html = renderToStaticMarkup(
      <Header {...defaultProps} userEmail="engineer@relay.dev" onLogout={onLogout} />
    );
    expect(html).toContain('data-testid="user-profile-menu-button"');
    expect(html).toContain('engineer');
    expect(html).toContain('Supabase Auth');
  });

  it('clearly labels and distinguishes Demo Mode in user profile menu', () => {
    const html = renderToStaticMarkup(
      <Header {...defaultProps} userEmail="Demo Mode (Offline)" isDemoMode={true} />
    );
    expect(html).toContain('data-testid="user-profile-menu-button"');
    expect(html).toContain('Demo Mode');
    expect(html).toContain('Offline Demo');
  });

  it('does not display fake collaborator avatars', () => {
    const html = renderToStaticMarkup(<Header {...defaultProps} />);
    expect(html).not.toContain('Alex M.');
    expect(html).not.toContain('Elena R.');
    expect(html).not.toContain('David K.');
  });

  it('invokes the onSave handler when the button onClick handler is triggered', () => {
    const onSave = vi.fn();
    const element = <Header {...defaultProps} onSave={onSave} />;
    expect(element.props.onSave).toBe(onSave);
    element.props.onSave();
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('renders live collaborator presence with "Only you here" when no other collaborators are connected', () => {
    const html = renderToStaticMarkup(<Header {...defaultProps} collaborators={[]} isRealtimeConnected={true} />);
    expect(html).toContain('data-testid="collaborator-presence-button"');
    expect(html).toContain('Only you here');
    expect(html).toContain('bg-[#00ff88]');
  });

  it('renders live collaborator presence count and real user initials when other collaborators are present', () => {
    const mockCollaborators = [
      {
        id: 'user-2',
        name: 'Sarah Connor',
        displayName: 'Sarah Connor',
        email: 'sarah@skynet.com',
        color: '#ff4444',
        status: 'editing' as const,
      },
    ];
    const html = renderToStaticMarkup(
      <Header {...defaultProps} collaborators={mockCollaborators} isRealtimeConnected={true} />
    );
    expect(html).toContain('data-testid="collaborator-presence-button"');
    expect(html).toContain('2 collaborating');
    expect(html).toContain('SC'); // Sarah Connor initials
  });

  it('displays amber indicator when realtime connection is offline or reconnecting', () => {
    const html = renderToStaticMarkup(<Header {...defaultProps} isRealtimeConnected={false} />);
    expect(html).toContain('bg-amber-400');
  });
});

