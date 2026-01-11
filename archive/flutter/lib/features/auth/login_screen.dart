import 'package:flutter/material.dart';
import '../../core/services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  String _role = 'driver'; // toggle for MVP
  bool _isLogin = true;
  String? _error;

  final _auth = AuthService();

  Future<void> _submit() async {
    setState(() => _error = null);
    try {
      if (_isLogin) {
        await _auth.login(
          email: _email.text.trim(),
          password: _password.text.trim(),
        );
      } else {
        await _auth.signUp(
          email: _email.text.trim(),
          password: _password.text.trim(),
          role: _role,
        );
      }
    } catch (e) {
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TextField(
              controller: _email,
              decoration: const InputDecoration(labelText: 'Email'),
            ),
            TextField(
              controller: _password,
              decoration: const InputDecoration(labelText: 'Password'),
              obscureText: true,
            ),
            if (!_isLogin)
              DropdownButton<String>(
                value: _role,
                items: const [
                  DropdownMenuItem(value: 'driver', child: Text('Driver')),
                  DropdownMenuItem(value: 'customer', child: Text('Customer')),
                ],
                onChanged: (v) => setState(() => _role = v!),
              ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _submit,
              child: Text(_isLogin ? 'Login' : 'Sign Up'),
            ),
            TextButton(
              onPressed: () => setState(() => _isLogin = !_isLogin),
              child: Text(
                _isLogin ? 'Create account' : 'Have an account? Login',
              ),
            ),
            if (_error != null)
              Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
        ),
      ),
    );
  }
}
