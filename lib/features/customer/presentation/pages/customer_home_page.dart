import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared_widgets/floating_card.dart';

class CustomerHomePage extends StatefulWidget {
  const CustomerHomePage({super.key});

  @override
  State<CustomerHomePage> createState() => _CustomerHomePageState();
}

class _CustomerHomePageState extends State<CustomerHomePage> {
  int _currentIndex = 0;

  final List<Widget> _pages = [
    const _HomeTab(),
    const _OrdersTab(),
    const _ProfileTab(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _pages[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_outlined),
            activeIcon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long_outlined),
            activeIcon: Icon(Icons.receipt_long),
            label: 'Orders',
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

class _HomeTab extends StatelessWidget {
  const _HomeTab();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Icon(
              Icons.location_on_outlined,
              color: AppTheme.customerColor,
              size: 20,
            ),
            const SizedBox(width: 8),
            const Expanded(
              child: Text(
                'Deliver to: Home',
                style: TextStyle(fontSize: 16),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {
              // TODO: Show notifications
            },
          ),
          IconButton(
            icon: const Icon(Icons.shopping_cart_outlined),
            onPressed: () {
              // TODO: Show cart
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Search Bar
            Container(
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceVariant.withOpacity(0.5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: TextField(
                decoration: InputDecoration(
                  hintText: 'Search for restaurants or food...',
                  prefixIcon: const Icon(Icons.search),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                ),
                onTap: () {
                  // TODO: Navigate to search page
                },
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Quick Actions
            Text(
              'Quick Actions',
              style: AppTheme.titleStyle,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _QuickActionCard(
                    icon: Icons.restaurant,
                    title: 'Food Delivery',
                    color: Colors.orange,
                    onTap: () {
                      // TODO: Navigate to restaurants
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _QuickActionCard(
                    icon: Icons.local_grocery_store,
                    title: 'Grocery',
                    color: Colors.green,
                    onTap: () {
                      // TODO: Navigate to grocery
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _QuickActionCard(
                    icon: Icons.local_pharmacy,
                    title: 'Pharmacy',
                    color: Colors.red,
                    onTap: () {
                      // TODO: Navigate to pharmacy
                    },
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // Featured Restaurants
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Featured Restaurants',
                  style: AppTheme.titleStyle,
                ),
                TextButton(
                  onPressed: () {
                    // TODO: Show all restaurants
                  },
                  child: const Text('See All'),
                ),
              ],
            ),
            
            const SizedBox(height: 12),
            
            SizedBox(
              height: 200,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: 5,
                itemBuilder: (context, index) {
                  return Container(
                    width: 160,
                    margin: const EdgeInsets.only(right: 12),
                    child: ProductCard(
                      title: 'Restaurant ${index + 1}',
                      subtitle: 'Italian • 25-30 min',
                      price: '\$3.99 delivery',
                      imageUrl: 'https://via.placeholder.com/160x120',
                      onTap: () {
                        // TODO: Navigate to restaurant details
                      },
                    ),
                  );
                },
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Recent Orders
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Order Again',
                  style: AppTheme.titleStyle,
                ),
                TextButton(
                  onPressed: () => context.go('/customer/orders'),
                  child: const Text('View All'),
                ),
              ],
            ),
            
            const SizedBox(height: 12),
            
            // Mock recent orders
            ...List.generate(3, (index) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: OrderCard(
                  orderId: 'order_${DateTime.now().millisecondsSinceEpoch + index}',
                  status: ['delivered', 'delivered', 'delivered'][index],
                  customerName: 'You',
                  restaurantName: 'Restaurant ${index + 1}',
                  orderTime: '${index + 1} day${index > 0 ? 's' : ''} ago',
                  totalAmount: 25.99 + (index * 5),
                  onTap: () {
                    // TODO: Show order details
                  },
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionCard({
    required this.icon,
    required this.title,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return FloatingCard(
      onTap: onTap,
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              color: color,
              size: 24,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            title,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _OrdersTab extends StatelessWidget {
  const _OrdersTab();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Orders'),
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
          final statuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: OrderCard(
              orderId: 'order_${DateTime.now().millisecondsSinceEpoch + index}',
              status: statuses[index % statuses.length],
              customerName: 'You',
              restaurantName: 'Restaurant ${index + 1}',
              orderTime: '${index + 1} hour${index > 0 ? 's' : ''} ago',
              estimatedDelivery: index < 3 ? '${20 - (index * 5)} min' : null,
              totalAmount: 25.99 + (index * 3),
              onTap: () {
                // TODO: Show order details
              },
            ),
          );
        },
      ),
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
                    backgroundColor: AppTheme.customerColor.withOpacity(0.1),
                    child: Icon(
                      Icons.person,
                      size: 30,
                      color: AppTheme.customerColor,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'John Doe',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'john.doe@example.com',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSurface.withOpacity(0.7),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Customer since 2024',
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
      {'icon': Icons.location_on_outlined, 'title': 'Delivery Addresses', 'trailing': Icons.arrow_forward_ios},
      {'icon': Icons.payment_outlined, 'title': 'Payment Methods', 'trailing': Icons.arrow_forward_ios},
      {'icon': Icons.star_outline, 'title': 'My Reviews', 'trailing': Icons.arrow_forward_ios},
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
                color: AppTheme.customerColor,
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