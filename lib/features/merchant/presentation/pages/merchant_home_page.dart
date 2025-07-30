import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared_widgets/floating_card.dart';

class MerchantHomePage extends StatefulWidget {
  const MerchantHomePage({super.key});

  @override
  State<MerchantHomePage> createState() => _MerchantHomePageState();
}

class _MerchantHomePageState extends State<MerchantHomePage> {
  int _currentIndex = 0;

  final List<Widget> _pages = [
    const _HomeTab(),
    const _OrdersTab(),
    const _MenuTab(),
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
        selectedItemColor: AppTheme.merchantColor,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long_outlined),
            activeIcon: Icon(Icons.receipt_long),
            label: 'Orders',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.restaurant_menu_outlined),
            activeIcon: Icon(Icons.restaurant_menu),
            label: 'Menu',
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
  bool _isOpen = true;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Restaurant Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {
              // TODO: Show notifications
            },
          ),
          IconButton(
            icon: const Icon(Icons.more_vert),
            onPressed: () {
              // TODO: Show more options
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Restaurant Status
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
                            'Restaurant Status',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _isOpen ? 'Currently Open' : 'Currently Closed',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: _isOpen ? AppTheme.merchantColor : Colors.red,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                      Switch(
                        value: _isOpen,
                        onChanged: (value) {
                          setState(() => _isOpen = value);
                          // TODO: Update restaurant status in backend
                        },
                        activeColor: AppTheme.merchantColor,
                      ),
                    ],
                  ),
                  
                  if (_isOpen) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.merchantColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.access_time,
                            color: AppTheme.merchantColor,
                            size: 16,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Open until 10:00 PM',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: AppTheme.merchantColor,
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
              'Today\'s Overview',
              style: AppTheme.titleStyle,
            ),
            const SizedBox(height: 12),
            
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    icon: Icons.receipt_long,
                    title: 'Orders',
                    value: '28',
                    color: AppTheme.merchantColor,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    icon: Icons.attach_money,
                    title: 'Revenue',
                    value: '\$425',
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
                    icon: Icons.schedule,
                    title: 'Avg. Prep',
                    value: '18m',
                    color: Colors.blue,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    icon: Icons.star,
                    title: 'Rating',
                    value: '4.7',
                    color: Colors.orange,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // Recent Orders
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Recent Orders',
                  style: AppTheme.titleStyle,
                ),
                TextButton(
                  onPressed: () => context.go('/merchant/orders'),
                  child: const Text('View All'),
                ),
              ],
            ),
            
            const SizedBox(height: 12),
            
            // Mock recent orders
            ...List.generate(3, (index) {
              final statuses = ['confirmed', 'preparing', 'ready'];
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: OrderCard(
                  orderId: 'order_${DateTime.now().millisecondsSinceEpoch + index}',
                  status: statuses[index],
                  customerName: 'Customer ${index + 1}',
                  orderTime: '${5 + (index * 2)} min ago',
                  estimatedDelivery: '${10 + (index * 5)} min',
                  totalAmount: 28.99 + (index * 7),
                  onTap: () {
                    // TODO: Show order details
                  },
                ),
              );
            }),
            
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
                    icon: Icons.add_circle_outline,
                    title: 'Add Menu Item',
                    color: AppTheme.merchantColor,
                    onTap: () {
                      // TODO: Navigate to add menu item
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _QuickActionCard(
                    icon: Icons.inventory_outlined,
                    title: 'Manage Inventory',
                    color: Colors.blue,
                    onTap: () {
                      // TODO: Navigate to inventory management
                    },
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 12),
            
            Row(
              children: [
                Expanded(
                  child: _QuickActionCard(
                    icon: Icons.campaign_outlined,
                    title: 'Promotions',
                    color: Colors.purple,
                    onTap: () {
                      // TODO: Navigate to promotions
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _QuickActionCard(
                    icon: Icons.analytics_outlined,
                    title: 'Analytics',
                    color: Colors.teal,
                    onTap: () {
                      // TODO: Navigate to analytics
                    },
                  ),
                ),
              ],
            ),
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
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Orders'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'New'),
              Tab(text: 'Preparing'),
              Tab(text: 'Ready'),
              Tab(text: 'Completed'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _OrdersList(status: 'confirmed'),
            _OrdersList(status: 'preparing'),
            _OrdersList(status: 'ready'),
            _OrdersList(status: 'completed'),
          ],
        ),
      ),
    );
  }
}

class _OrdersList extends StatelessWidget {
  final String status;

  const _OrdersList({required this.status});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 8,
      itemBuilder: (context, index) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: OrderCard(
            orderId: 'order_${DateTime.now().millisecondsSinceEpoch + index}',
            status: status,
            customerName: 'Customer ${index + 1}',
            orderTime: '${index + 5} min ago',
            estimatedDelivery: status != 'completed' ? '${15 + (index * 3)} min' : null,
            totalAmount: 32.99 + (index * 4),
            onTap: () {
              // TODO: Show order details and actions
            },
          ),
        );
      },
    );
  }
}

class _MenuTab extends StatelessWidget {
  const _MenuTab();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Menu Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              // TODO: Add new menu item
            },
          ),
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 12,
        itemBuilder: (context, index) {
          final categories = ['Appetizers', 'Main Courses', 'Desserts'];
          final items = ['Dish A', 'Dish B', 'Dish C', 'Dish D'];
          
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: ProductCard(
              title: '${items[index % items.length]} ${index + 1}',
              subtitle: categories[index % categories.length],
              price: '\$${12.99 + (index * 2)}',
              imageUrl: 'https://via.placeholder.com/160x120',
              isAvailable: index % 5 != 0, // Make some items unavailable
              customBadge: index % 3 == 0 
                  ? Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.merchantColor,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'Popular',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    )
                  : null,
              onTap: () {
                // TODO: Edit menu item
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
        title: const Text('Restaurant Profile'),
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
            // Restaurant Header
            FloatingCard(
              child: Column(
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 30,
                        backgroundColor: AppTheme.merchantColor.withOpacity(0.1),
                        child: Icon(
                          Icons.restaurant,
                          size: 30,
                          color: AppTheme.merchantColor,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Bella Italia Restaurant',
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
                                  '4.7 (234 reviews)',
                                  style: theme.textTheme.bodyMedium,
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Italian Cuisine • Fine Dining',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.colorScheme.onSurface.withOpacity(0.7),
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.edit_outlined),
                        onPressed: () {
                          // TODO: Edit restaurant profile
                        },
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Restaurant Info
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceVariant.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      children: [
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
                                '123 Main Street, Downtown',
                                style: theme.textTheme.bodySmall,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Icon(
                              Icons.phone_outlined,
                              size: 16,
                              color: theme.colorScheme.onSurface.withOpacity(0.6),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '+1 (555) 123-4567',
                              style: theme.textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Business Stats
            Text(
              'Business Performance',
              style: AppTheme.titleStyle,
            ),
            const SizedBox(height: 12),
            
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    icon: Icons.trending_up,
                    title: 'Monthly Orders',
                    value: '1,247',
                    color: AppTheme.merchantColor,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    icon: Icons.attach_money,
                    title: 'Monthly Revenue',
                    value: '\$15.2K',
                    color: Colors.green,
                  ),
                ),
              ],
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
      {'icon': Icons.schedule_outlined, 'title': 'Operating Hours', 'trailing': Icons.arrow_forward_ios},
      {'icon': Icons.delivery_dining_outlined, 'title': 'Delivery Settings', 'trailing': Icons.arrow_forward_ios},
      {'icon': Icons.payment_outlined, 'title': 'Payment Settings', 'trailing': Icons.arrow_forward_ios},
      {'icon': Icons.campaign_outlined, 'title': 'Promotions & Offers', 'trailing': Icons.arrow_forward_ios},
      {'icon': Icons.analytics_outlined, 'title': 'Analytics & Reports', 'trailing': Icons.arrow_forward_ios},
      {'icon': Icons.support_agent_outlined, 'title': 'Help & Support', 'trailing': Icons.arrow_forward_ios},
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
                color: AppTheme.merchantColor,
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