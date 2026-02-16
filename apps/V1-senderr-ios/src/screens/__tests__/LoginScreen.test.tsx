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
  const signUpWithEmail = jest.fn();

  beforeEach(() => {
    signInWithEmail.mockReset();
    signUpWithEmail.mockReset();
    (useAuth as jest.Mock).mockReturnValue({
      signInWithEmail,
      signUpWithEmail,
      signingIn: false,
      signingUp: false,
    });
  });

  it('submits email/password to auth service', () => {
    const screen = renderer.create(<LoginScreen />);
    const inputs = screen.root.findAllByType(TextInput);

    act(() => {
      inputs[0].props.onChangeText('driver@example.com');
      inputs[1].props.onChangeText('StrongPass123!');
    });

    const signInButton = screen.root.findByProps({label: 'Sign in'});
    act(() => {
      signInButton.props.onPress();
    });

    expect(signInWithEmail).toHaveBeenCalledWith('driver@example.com', 'StrongPass123!');
  });

  it('shows sign-in error feedback', async () => {
    signInWithEmail.mockRejectedValueOnce(new Error('Bad credentials'));
    const screen = renderer.create(<LoginScreen />);
    const signInButton = screen.root.findByProps({label: 'Sign in'});

    await act(async () => {
      signInButton.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.root.findByProps({children: 'Bad credentials'})).toBeTruthy();
  });

  it('submits sign-up form to auth service', () => {
    const screen = renderer.create(<LoginScreen />);
    const signUpToggle = screen.root.findByProps({testID: 'auth-mode-signup'});

    act(() => {
      signUpToggle.props.onPress();
    });

    const inputs = screen.root.findAllByType(TextInput);
    act(() => {
      inputs[0].props.onChangeText('Driver Test');
      inputs[1].props.onChangeText('driver@example.com');
      inputs[2].props.onChangeText('StrongPass123!');
      inputs[3].props.onChangeText('StrongPass123!');
    });

    const submit = screen.root.findByProps({label: 'Create account'});
    act(() => {
      submit.props.onPress();
    });

    expect(signUpWithEmail).toHaveBeenCalledWith(
      'driver@example.com',
      'StrongPass123!',
      'Driver Test',
    );
  });

  it('exposes accessibility testIDs for inputs', () => {
    const screen = renderer.create(<LoginScreen />);
    expect(screen.root.findByProps({testID: 'auth-email'})).toBeTruthy();
    expect(screen.root.findByProps({testID: 'auth-password'})).toBeTruthy();
  });

  it('toggles password visibility when pressing toggle', () => {
    const screen = renderer.create(<LoginScreen />);
    const inputs = screen.root.findAllByType(TextInput);
    // email, password in signin mode
    expect(inputs[1].props.secureTextEntry).toBeTruthy();
    const toggle = screen.root.findByProps({testID: 'auth-password-toggle'});
    act(() => {
      toggle.props.onPress();
    });
    const inputsAfter = screen.root.findAllByType(TextInput);
    expect(inputsAfter[1].props.secureTextEntry).toBeFalsy();
  });

  it('renders forgot password link in sign-in mode', () => {
    const screen = renderer.create(<LoginScreen />);
    expect(screen.root.findByProps({testID: 'forgot-password'})).toBeTruthy();
  });
});
