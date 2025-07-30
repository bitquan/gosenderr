import 'package:flutter/material.dart';
import '../../../shared_widgets/floating_card.dart';

class AdminHomeScreen extends StatelessWidget {
  const AdminHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('GoSender - Admin Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications),
            onPressed: () {
              // TODO: Navigate to notifications
            },
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () {
              // TODO: Navigate to admin settings
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Welcome section
            Card(
              color: Theme.of(context).colorScheme.primaryContainer,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Admin Dashboard',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text('Monitor and manage the GoSender platform'),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Key metrics
            Text(
              'Platform Overview',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            
            // First row of metrics
            Row(
              children: [
                Expanded(
                  child: _buildMetricCard(
                    context,
                    'Total Users',
                    '12,345',
                    Icons.people,
                    Colors.blue,
                    '+5.2%',
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildMetricCard(
                    context,
                    'Active Orders',
                    '567',
                    Icons.receipt_long,
                    Colors.orange,
                    '+12.1%',
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 16),
            
            // Second row of metrics
            Row(
              children: [
                Expanded(
                  child: _buildMetricCard(
                    context,
                    'Total Revenue',
                    '\$45,678',
                    Icons.attach_money,
                    Colors.green,
                    '+8.7%',
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildMetricCard(
                    context,
                    'Active Vendors',
                    '234',
                    Icons.store,
                    Colors.purple,
                    '+3.4%',
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 16),
            
            // Third row of metrics
            Row(
              children: [
                Expanded(
                  child: _buildMetricCard(
                    context,
                    'Delivery Agents',
                    '89',
                    Icons.local_shipping,
                    Colors.indigo,
                    '+15.6%',
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildMetricCard(
                    context,
                    'Avg Rating',
                    '4.7',
                    Icons.star,
                    Colors.amber,
                    '+0.2',
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // Quick actions
            Text(
              'Management Tools',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              children: [
                _buildActionCard(
                  context,
                  'User Management',
                  Icons.person_outline,
                  'Manage customers, vendors, and delivery agents',
                  () {
                    // TODO: Navigate to user management
                  },
                ),
                _buildActionCard(
                  context,
                  'Order Monitoring',
                  Icons.monitor_heart,
                  'Track and resolve order issues',
                  () {
                    // TODO: Navigate to order monitoring
                  },
                ),
                _buildActionCard(
                  context,
                  'Analytics',
                  Icons.analytics,
                  'View detailed platform analytics',
                  () {
                    // TODO: Navigate to analytics
                  },
                ),
                _buildActionCard(
                  context,
                  'Reports',
                  Icons.assessment,
                  'Generate business reports',
                  () {
                    // TODO: Navigate to reports
                  },
                ),
                _buildActionCard(
                  context,
                  'Platform Settings',
                  Icons.settings_applications,
                  'Configure platform settings',
                  () {
                    // TODO: Navigate to platform settings
                  },
                ),
                _buildActionCard(
                  context,
                  'Support Center',
                  Icons.support_agent,
                  'Handle customer support tickets',
                  () {
                    // TODO: Navigate to support center
                  },
                ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // Recent activity
            Text(
              'Recent Activity',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            
            Column(
              children: [
                _buildActivityItem(
                  context,
                  'New vendor registration',
                  'Pizza Palace joined the platform',
                  Icons.store_mall_directory,
                  Colors.green,
                  '5 minutes ago',
                ),
                _buildActivityItem(
                  context,
                  'Order dispute reported',
                  'Order #1234 requires admin attention',
                  Icons.report_problem,
                  Colors.orange,
                  '12 minutes ago',
                ),
                _buildActivityItem(
                  context,
                  'Payment issue resolved',
                  'Payment gateway issue fixed',
                  Icons.payment,
                  Colors.blue,
                  '1 hour ago',
                ),
                _buildActivityItem(
                  context,
                  'System maintenance',
                  'Scheduled maintenance completed',
                  Icons.build_circle,
                  Colors.purple,
                  '2 hours ago',
                ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // System status
            const FloatingCard(
              title: 'System Status',
              subtitle: 'All systems operational - Platform running smoothly',
              icon: Icons.check_circle,
              backgroundColor: Colors.green,
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // TODO: Quick admin actions menu
        },
        child: const Icon(Icons.admin_panel_settings),
      ),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: 0,
        onTap: (index) {
          switch (index) {
            case 0:
              // Already on dashboard
              break;
            case 1:
              // TODO: Navigate to users management
              break;
            case 2:
              // TODO: Navigate to analytics
              break;
            case 3:
              // TODO: Navigate to settings
              break;
          }
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.people),
            label: 'Users',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.analytics),
            label: 'Analytics',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
  
  Widget _buildMetricCard(
    BuildContext context,
    String title,
    String value,
    IconData icon,
    Color color,
    String change,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Icon(icon, color: color, size: 24),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    change,
                    style: const TextStyle(
                      fontSize: 10,
                      color: Colors.green,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              title,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildActionCard(
    BuildContext context,
    String title,
    IconData icon,
    String description,
    VoidCallback onTap,
  ) {
    return InkWell(
      onTap: onTap,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 32,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                description,
                style: Theme.of(context).textTheme.bodySmall,
                textAlign: TextAlign.center,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildActivityItem(
    BuildContext context,
    String title,
    String description,
    IconData icon,
    Color color,
    String time,
  ) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withOpacity(0.1),
          child: Icon(icon, color: color, size: 20),
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(description),
        trailing: Text(
          time,
          style: Theme.of(context).textTheme.bodySmall,
        ),
        onTap: () {
          // TODO: Navigate to activity details
        },
      ),
    );
  }
}