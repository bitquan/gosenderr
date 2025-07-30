import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared_widgets/floating_card.dart';

class DriverHomePage extends StatefulWidget {
  const DriverHomePage({super.key});

  @override
  State<DriverHomePage> createState() => _DriverHomePageState();
}

class _DriverHomePageState extends State<DriverHomePage> {
  int _currentIndex = 0;
  bool _isOnline = false;

  final List<Widget> _pages = [
    const _HomeTab(),
    const _DeliveriesTab(),
    const _EarningsTab(),
    const _ProfileTab(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _pages[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        selectedItemColor: AppTheme.driverColor,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_outlined),
            activeIcon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.delivery_dining_outlined),
            activeIcon: Icon(Icons.delivery_dining),
            label: 'Deliveries',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.attach_money_outlined),
            activeIcon: Icon(Icons.attach_money),
            label: 'Earnings',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outlined),
            activeIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

class _HomeTab extends StatefulWidget {
  const _HomeTab();

  @override
  State<_HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<_HomeTab> {
  bool _isOnline = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Driver Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {
              // TODO: Show notifications
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Online/Offline Toggle
            FloatingCard(
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _isOnline ? 'You\'re Online' : 'You\'re Offline',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: _isOnline ? AppTheme.driverColor : Colors.grey,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _isOnline 
                                ? 'Ready to receive delivery requests'
                                : 'Go online to start receiving requests',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: theme.colorScheme.onSurface.withOpacity(0.7),
                            ),
                          ),
                        ],
                      ),
                      Switch(
                        value: _isOnline,
                        onChanged: (value) {
                          setState(() => _isOnline = value);
                          // TODO: Update driver status in backend
                        },
                        activeColor: AppTheme.driverColor,
                      ),
                    ],
                  ),
                  
                  if (_isOnline) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.driverColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.location_on,
                            color: AppTheme.driverColor,
                            size: 16,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Current location: Downtown Area',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: AppTheme.driverColor,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Today's Stats
            Text(
              'Today\'s Performance',
              style: AppTheme.titleStyle,
            ),
            const SizedBox(height: 12),
            
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    icon: Icons.delivery_dining,
                    title: 'Deliveries',
                    value: '12',
                    color: AppTheme.driverColor,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    icon: Icons.attach_money,
                    title: 'Earnings',
                    value: '\$95.50',
                    color: Colors.green,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 12),
            
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    icon: Icons.timer,
                    title: 'Online Time',
                    value: '8.5h',
                    color: Colors.blue,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    icon: Icons.star,
                    title: 'Rating',
                    value: '4.8',
                    color: Colors.orange,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // Available Deliveries
            if (_isOnline) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Available Deliveries',
                    style: AppTheme.titleStyle,
                  ),
                  TextButton(
                    onPressed: () {
                      // TODO: Refresh available deliveries
                    },
                    child: const Text('Refresh'),
                  ),
                ],
              ),
              
              const SizedBox(height: 12),
              
              // Mock available deliveries
              ...List.generate(3, (index) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _DeliveryRequestCard(
                    restaurantName: 'Restaurant ${index + 1}',
                    customerAddress: '123 Main St, Apt ${index + 1}',
                    distance: '${1.2 + (index * 0.5)} km',
                    estimatedEarning: '\$${8.50 + (index * 2)}',
                    orderValue: '\$${25.99 + (index * 5)}',
                    onAccept: () {
                      // TODO: Accept delivery request
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Delivery request accepted!')),
                      );
                    },
                    onDecline: () {
                      // TODO: Decline delivery request
                    },
                  ),
                );
              }),
            ] else ...[
              // Offline Message
              FloatingCard(
                child: Column(
                  children: [
                    Icon(
                      Icons.delivery_dining_outlined,
                      size: 64,
                      color: theme.colorScheme.onSurface.withOpacity(0.3),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Go Online to Start Earning',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Toggle the switch above to start receiving delivery requests',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurface.withOpacity(0.7),
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.title,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return FloatingCard(
      child: Column(
        children: [
          Icon(
            icon,
            color: color,
            size: 24,
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurface.withOpacity(0.7),
            ),
          ),
        ],
      ),
    );
  }
}

class _DeliveryRequestCard extends StatelessWidget {
  final String restaurantName;
  final String customerAddress;
  final String distance;
  final String estimatedEarning;
  final String orderValue;
  final VoidCallback onAccept;
  final VoidCallback onDecline;

  const _DeliveryRequestCard({
    required this.restaurantName,
    required this.customerAddress,
    required this.distance,
    required this.estimatedEarning,
    required this.orderValue,
    required this.onAccept,
    required this.onDecline,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return FloatingCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                restaurantName,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.driverColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  estimatedEarning,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppTheme.driverColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 12),
          
          // Details
          Row(
            children: [
              Icon(
                Icons.location_on_outlined,
                size: 16,
                color: theme.colorScheme.onSurface.withOpacity(0.6),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  customerAddress,
                  style: theme.textTheme.bodyMedium,
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 8),
          
          Row(
            children: [
              Icon(
                Icons.route_outlined,
                size: 16,
                color: theme.colorScheme.onSurface.withOpacity(0.6),
              ),
              const SizedBox(width: 8),
              Text(
                '$distance • Order Value: $orderValue',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withOpacity(0.7),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // Actions
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: onDecline,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red,
                    side: const BorderSide(color: Colors.red),
                  ),
                  child: const Text('Decline'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: onAccept,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.driverColor,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Accept'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DeliveriesTab extends StatelessWidget {
  const _DeliveriesTab();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Deliveries'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () {
              // TODO: Show filter options
            },
          ),
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 10,
        itemBuilder: (context, index) {
          final statuses = ['assigned', 'picked_up', 'in_transit', 'completed'];
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: OrderCard(
              orderId: 'delivery_${DateTime.now().millisecondsSinceEpoch + index}',
              status: statuses[index % statuses.length],
              customerName: 'Customer ${index + 1}',
              restaurantName: 'Restaurant ${index + 1}',
              orderTime: '${index + 1} hour${index > 0 ? 's' : ''} ago',
              totalAmount: 8.50 + (index * 2),
              onTap: () {
                // TODO: Show delivery details
              },
            ),
          );
        },
      ),
    );
  }
}

class _EarningsTab extends StatelessWidget {
  const _EarningsTab();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Earnings'),
        actions: [
          IconButton(
            icon: const Icon(Icons.date_range),
            onPressed: () {
              // TODO: Show date picker
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Total Earnings Card
            FloatingCard(
              child: Column(
                children: [
                  Text(
                    'Total Earnings (This Week)',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: theme.colorScheme.onSurface.withOpacity(0.7),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '\$487.50',
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.driverColor,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _EarningsStat(
                        title: 'Deliveries',
                        value: '42',
                      ),
                      _EarningsStat(
                        title: 'Avg/Delivery',
                        value: '\$11.60',
                      ),
                      _EarningsStat(
                        title: 'Online Hours',
                        value: '35.5h',
                      ),
                    ],
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Daily Breakdown
            Text(
              'Daily Breakdown',
              style: AppTheme.titleStyle,
            ),
            const SizedBox(height: 12),
            
            ...List.generate(7, (index) {
              final days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
              final earnings = [85.50, 92.20, 78.90, 105.30, 125.60, 0.0, 0.0];
              final deliveries = [7, 8, 6, 9, 11, 0, 0];
              
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: FloatingCard(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            days[index],
                            style: theme.textTheme.titleSmall,
                          ),
                          Text(
                            '${deliveries[index]} deliveries',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurface.withOpacity(0.7),
                            ),
                          ),
                        ],
                      ),
                      Text(
                        '\$${earnings[index].toStringAsFixed(2)}',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: earnings[index] > 0 ? AppTheme.driverColor : Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _EarningsStat extends StatelessWidget {
  final String title;
  final String value;

  const _EarningsStat({
    required this.title,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Column(
      children: [
        Text(
          value,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          title,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurface.withOpacity(0.7),
          ),
        ),
      ],
    );
  }
}

class _ProfileTab extends StatelessWidget {
  const _ProfileTab();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () {
              // TODO: Navigate to settings
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Profile Header
            FloatingCard(
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: AppTheme.driverColor.withOpacity(0.1),
                    child: Icon(
                      Icons.person,
                      size: 30,
                      color: AppTheme.driverColor,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Mike Johnson',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(
                              Icons.star,
                              size: 16,
                              color: Colors.orange,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '4.8 (127 reviews)',
                              style: theme.textTheme.bodyMedium,
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Driver since 2023',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurface.withOpacity(0.5),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.edit_outlined),
                    onPressed: () {
                      // TODO: Edit profile
                    },
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Menu Options
            ..._buildMenuItems(context),
            
            const SizedBox(height: 24),
            
            // Sign Out Button
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {
                  // TODO: Sign out
                  context.go('/auth/login');
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red,
                  side: const BorderSide(color: Colors.red),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: const Text('Sign Out'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildMenuItems(BuildContext context) {
    final items = [
      {'icon': Icons.directions_car_outlined, 'title': 'Vehicle Information', 'trailing': Icons.arrow_forward_ios},
      {'icon': Icons.document_scanner_outlined, 'title': 'Documents', 'trailing': Icons.arrow_forward_ios},
      {'icon': Icons.payment_outlined, 'title': 'Payment Settings', 'trailing': Icons.arrow_forward_ios},
      {'icon': Icons.support_agent_outlined, 'title': 'Help & Support', 'trailing': Icons.arrow_forward_ios},
      {'icon': Icons.info_outline, 'title': 'About', 'trailing': Icons.arrow_forward_ios},
    ];

    return items.map((item) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: FloatingCard(
          onTap: () {
            // TODO: Navigate to respective pages
          },
          child: Row(
            children: [
              Icon(
                item['icon'] as IconData,
                color: AppTheme.driverColor,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  item['title'] as String,
                  style: const TextStyle(fontSize: 16),
                ),
              ),
              Icon(
                item['trailing'] as IconData,
                size: 16,
                color: Colors.grey,
              ),
            ],
          ),
        ),
      );
    }).toList();
  }
}