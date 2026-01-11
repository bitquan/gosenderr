import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class DriverOnboardingScreen extends StatefulWidget {
  const DriverOnboardingScreen({super.key});

  @override
  State<DriverOnboardingScreen> createState() => _DriverOnboardingScreenState();
}

class _DriverOnboardingScreenState extends State<DriverOnboardingScreen> {
  String vehicleType = 'car';
  double baseFare = 8;
  double perMile = 2;
  double perMinute = 0.4;
  double radius = 25;
  bool _loading = false;
  String? _error;

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final uid = FirebaseAuth.instance.currentUser!.uid;

    try {
      await FirebaseFirestore.instance.collection('drivers').doc(uid).set({
        'vehicleType': vehicleType,
        'baseFare': baseFare,
        'perMile': perMile,
        'perMinute': perMinute,
        'maxRadiusMiles': radius,
        'isActive': true,
        'createdAt': FieldValue.serverTimestamp(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Setup saved')));
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString());
      }
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Driver Setup')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: SingleChildScrollView(
          child: Column(
            children: [
              if (_error != null)
                Text(_error!, style: const TextStyle(color: Colors.red)),
              DropdownButton<String>(
                value: vehicleType,
                items: const [
                  DropdownMenuItem(value: 'foot', child: Text('On Foot')),
                  DropdownMenuItem(value: 'bike', child: Text('Bike')),
                  DropdownMenuItem(value: 'car', child: Text('Car')),
                  DropdownMenuItem(value: 'suv', child: Text('SUV')),
                  DropdownMenuItem(
                    value: 'pickup',
                    child: Text('Pickup Truck'),
                  ),
                  DropdownMenuItem(value: 'van', child: Text('Van')),
                ],
                onChanged: (v) => setState(() => vehicleType = v!),
              ),
              const SizedBox(height: 12),

              Text('Base Fare: \$${baseFare.toStringAsFixed(2)}'),
              Slider(
                value: baseFare,
                min: 0,
                max: 20,
                divisions: 40,
                onChanged: (v) => setState(() => baseFare = v),
              ),

              Text('Per Mile: \$${perMile.toStringAsFixed(2)}'),
              Slider(
                value: perMile,
                min: 0,
                max: 5,
                divisions: 50,
                onChanged: (v) => setState(() => perMile = v),
              ),

              Text('Per Minute: \$${perMinute.toStringAsFixed(2)}'),
              Slider(
                value: perMinute,
                min: 0,
                max: 1,
                divisions: 50,
                onChanged: (v) => setState(() => perMinute = v),
              ),

              Text('Max Radius: ${radius.toInt()} miles'),
              Slider(
                value: radius,
                min: 1,
                max: 50,
                divisions: 49,
                onChanged: (v) => setState(() => radius = v),
              ),

              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loading ? null : _submit,
                child: const Text('Finish Setup'),
              ),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.only(top: 12),
                  child: CircularProgressIndicator(),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
