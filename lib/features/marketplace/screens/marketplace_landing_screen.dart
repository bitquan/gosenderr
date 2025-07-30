import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class MarketplaceLandingScreen extends StatefulWidget {
  const MarketplaceLandingScreen({super.key});

  @override
  State<MarketplaceLandingScreen> createState() =>
      _MarketplaceLandingScreenState();
}

class _MarketplaceLandingScreenState extends State<MarketplaceLandingScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Icon(
              Icons.local_shipping,
              color: theme.colorScheme.primary,
            ),
            const SizedBox(width: 8),
            const Text('GoSender Marketplace'),
          ],
        ),
        actions: [
          TextButton.icon(
            onPressed: () => context.go('/login'),
            icon: const Icon(Icons.login),
            label: const Text('Login'),
          ),
          const SizedBox(width: 8),
          ElevatedButton.icon(
            onPressed: () => context.go('/register'),
            icon: const Icon(Icons.person_add),
            label: const Text('Sign Up'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            ),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero Section
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    theme.colorScheme.primary,
                    theme.colorScheme.primary.withOpacity(0.8),
                  ],
                ),
              ),
              child: Column(
                children: [
                  Text(
                    'Your One-Stop Delivery Marketplace',
                    style: theme.textTheme.headlineLarge?.copyWith(
                      color: theme.colorScheme.onPrimary,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Shop from local vendors • Send packages • Fast delivery',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: theme.colorScheme.onPrimary.withOpacity(0.9),
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),

                  // Search Bar
                  Container(
                    constraints: const BoxConstraints(maxWidth: 500),
                    child: TextField(
                      controller: _searchController,
                      decoration: InputDecoration(
                        hintText:
                            'Search for products, restaurants, services...',
                        prefixIcon: const Icon(Icons.search),
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () => _searchController.clear(),
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(25),
                          borderSide: BorderSide.none,
                        ),
                        filled: true,
                        fillColor: theme.colorScheme.surface,
                      ),
                      onSubmitted: (value) {
                        // TODO: Implement search functionality
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Searching for: $value')),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Quick Actions Section
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'What do you need?',
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 24),
                  GridView.count(
                    crossAxisCount:
                        MediaQuery.of(context).size.width > 600 ? 3 : 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    childAspectRatio: 1.2,
                    children: [
                      _buildQuickActionCard(
                        context,
                        icon: Icons.shopping_cart,
                        title: 'Shop Products',
                        subtitle: 'Browse from local vendors',
                        color: Colors.blue,
                        onTap: () => _showShopProducts(context),
                      ),
                      _buildQuickActionCard(
                        context,
                        icon: Icons.local_shipping,
                        title: 'Send Package',
                        subtitle: 'Quick delivery service',
                        color: Colors.green,
                        onTap: () => _showSendPackage(context),
                      ),
                      _buildQuickActionCard(
                        context,
                        icon: Icons.restaurant,
                        title: 'Food Delivery',
                        subtitle: 'Order from restaurants',
                        color: Colors.orange,
                        onTap: () => _showFoodDelivery(context),
                      ),
                      _buildQuickActionCard(
                        context,
                        icon: Icons.store,
                        title: 'Start Selling',
                        subtitle: 'Become a vendor',
                        color: Colors.purple,
                        onTap: () => _showBecomeVendor(context),
                      ),
                      _buildQuickActionCard(
                        context,
                        icon: Icons.delivery_dining,
                        title: 'Earn as Driver',
                        subtitle: 'Join delivery team',
                        color: Colors.teal,
                        onTap: () => _showBecomeDriver(context),
                      ),
                      _buildQuickActionCard(
                        context,
                        icon: Icons.support_agent,
                        title: 'Customer Support',
                        subtitle: 'Get help & support',
                        color: Colors.indigo,
                        onTap: () => _showSupport(context),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Featured Vendors Section
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Featured Vendors',
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 200,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: 5,
                      itemBuilder: (context, index) {
                        return _buildVendorCard(context, index);
                      },
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Popular Products Section
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Popular Products',
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount:
                          MediaQuery.of(context).size.width > 600 ? 4 : 2,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                      childAspectRatio: 0.8,
                    ),
                    itemCount: 8,
                    itemBuilder: (context, index) {
                      return _buildProductCard(context, index);
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showQuickDelivery(context),
        icon: const Icon(Icons.flash_on),
        label: const Text('Quick Delivery'),
        backgroundColor: theme.colorScheme.secondary,
      ),
    );
  }

  Widget _buildQuickActionCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);

    return Card(
      elevation: 4,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 32,
                color: color,
              ),
              const SizedBox(height: 8),
              Text(
                title,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVendorCard(BuildContext context, int index) {
    final theme = Theme.of(context);
    final vendors = [
      {'name': 'Fresh Foods Market', 'rating': '4.8', 'category': 'Groceries'},
      {'name': 'Pizza Palace', 'rating': '4.6', 'category': 'Restaurant'},
      {'name': 'Tech Store Plus', 'rating': '4.9', 'category': 'Electronics'},
      {'name': 'Fashion Hub', 'rating': '4.7', 'category': 'Clothing'},
      {'name': 'Green Pharmacy', 'rating': '4.8', 'category': 'Health'},
    ];

    final vendor = vendors[index];

    return Container(
      width: 160,
      margin: const EdgeInsets.only(right: 16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                height: 80,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Icon(
                    Icons.store,
                    size: 32,
                    color: theme.colorScheme.primary,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                vendor['name']!,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                vendor['category']!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(
                    Icons.star,
                    size: 16,
                    color: Colors.amber,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    vendor['rating']!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProductCard(BuildContext context, int index) {
    final theme = Theme.of(context);
    final products = [
      {'name': 'Fresh Apples', 'price': '\$3.99', 'store': 'Fresh Market'},
      {'name': 'Margherita Pizza', 'price': '\$12.99', 'store': 'Pizza Palace'},
      {
        'name': 'Wireless Headphones',
        'price': '\$79.99',
        'store': 'Tech Store'
      },
      {'name': 'Summer Dress', 'price': '\$29.99', 'store': 'Fashion Hub'},
      {'name': 'Vitamin C', 'price': '\$15.99', 'store': 'Green Pharmacy'},
      {'name': 'Organic Bread', 'price': '\$4.99', 'store': 'Fresh Market'},
      {'name': 'Smartphone Case', 'price': '\$19.99', 'store': 'Tech Store'},
      {'name': 'Coffee Beans', 'price': '\$8.99', 'store': 'Coffee Shop'},
    ];

    final product = products[index];

    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(12)),
              ),
              child: Center(
                child: Icon(
                  Icons.shopping_bag,
                  size: 32,
                  color: theme.colorScheme.primary,
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product['name']!,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  product['store']!,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  product['price']!,
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showShopProducts(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Opening product catalog...')),
    );
    // TODO: Navigate to product catalog
  }

  void _showSendPackage(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Send Package'),
        content: const Text(
            'Quick delivery service coming soon! Please login to access full features.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              context.go('/login');
            },
            child: const Text('Login'),
          ),
        ],
      ),
    );
  }

  void _showFoodDelivery(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Loading restaurants...')),
    );
    // TODO: Navigate to restaurant listings
  }

  void _showBecomeVendor(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Become a Vendor'),
        content: const Text(
            'Start selling on GoSender! Sign up as a vendor to list your products.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              context.go('/register');
            },
            child: const Text('Sign Up'),
          ),
        ],
      ),
    );
  }

  void _showBecomeDriver(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Become a Delivery Agent'),
        content: const Text(
            'Earn money delivering packages! Sign up as a delivery agent.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              context.go('/register');
            },
            child: const Text('Sign Up'),
          ),
        ],
      ),
    );
  }

  void _showSupport(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Opening support center...')),
    );
    // TODO: Navigate to support/help center
  }

  void _showQuickDelivery(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.flash_on,
                color: Theme.of(context).colorScheme.secondary),
            const SizedBox(width: 8),
            const Text('Quick Delivery'),
          ],
        ),
        content: const Text(
            'Need something delivered fast? Our quick delivery service can help!'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              context.go('/login');
            },
            child: const Text('Login to Continue'),
          ),
        ],
      ),
    );
  }
}
