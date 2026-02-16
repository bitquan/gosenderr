import React from 'react';
import {TextInput} from 'react-native';
import renderer, {act} from 'react-test-renderer';

import {useAuth} from '../../context/AuthContext';
import {LoginScreen} from '../LoginScreen';

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('LoginScreen', () => {
  const signInWithEmail = jest.fn();

  beforeEach(() => {
    signInWithEmail.mockReset();
    (useAuth as jest.Mock).mockReturnValue({
      signInWithEmail,
      signingIn: false,
    });
  });

  it('submits email/password to auth service', () => {
    const screen = renderer.create(<LoginScreen />);
    const inputs = screen.root.findAllByType(TextInput);

    act(() => {
      inputs[0].props.onChangeText('driver@example.com');
      inputs[1].props.onChangeText('StrongPass123!');
    });

    const signInButton = screen.root.findByProps({label: 'Sign In'});
    act(() => {
      signInButton.props.onPress();
    });

    expect(signInWithEmail).toHaveBeenCalledWith('driver@example.com', 'StrongPass123!');
  });

  it('shows sign-in error feedback', async () => {
    signInWithEmail.mockRejectedValueOnce(new Error('Bad credentials'));
    const screen = renderer.create(<LoginScreen />);
    const signInButton = screen.root.findByProps({label: 'Sign In'});

    await act(async () => {
      signInButton.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.root.findByProps({children: 'Bad credentials'})).toBeTruthy();
  });
});
