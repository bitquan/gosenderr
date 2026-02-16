import React from 'react';
import {Pressable, Text} from 'react-native';
import renderer, {act} from 'react-test-renderer';

import {EmptyState} from '../EmptyState';
import {ErrorState} from '../ErrorState';
import {LoadingState} from '../LoadingState';

describe('state components', () => {
  it('renders loading title and message when provided', () => {
    const screen = renderer.create(<LoadingState title="Loading jobs" message="Fetching assignments..." />);

    const texts = screen.root.findAllByType(Text).map(node => node.props.children);
    expect(texts).toContain('Loading jobs');
    expect(texts).toContain('Fetching assignments...');
  });

  it('hides loading message when not provided', () => {
    const screen = renderer.create(<LoadingState title="Loading profile" />);

    const texts = screen.root.findAllByType(Text).map(node => node.props.children);
    expect(texts).toContain('Loading profile');
    expect(texts).not.toContain('Fetching assignments...');
  });

  it('fires retry callback from ErrorState', () => {
    const onRetry = jest.fn();
    const screen = renderer.create(
      <ErrorState
        title="Unable to sync"
        message="Network dropped."
        retryLabel="Retry now"
        onRetry={onRetry}
      />,
    );

    const button = screen.root.findByType(Pressable);
    act(() => {
      button.props.onPress();
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('fires action callback from EmptyState', () => {
    const onAction = jest.fn();
    const screen = renderer.create(
      <EmptyState
        title="No jobs assigned"
        message="Assignments will appear here."
        actionLabel="Refresh jobs"
        onAction={onAction}
      />,
    );

    const button = screen.root.findByType(Pressable);
    act(() => {
      button.props.onPress();
    });
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not render action button when callbacks are absent', () => {
    const errorScreen = renderer.create(<ErrorState title="Error" message="Something failed." />);
    const emptyScreen = renderer.create(<EmptyState title="Empty" message="No data." />);

    expect(errorScreen.root.findAllByType(Pressable)).toHaveLength(0);
    expect(emptyScreen.root.findAllByType(Pressable)).toHaveLength(0);
  });
});
