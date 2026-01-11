import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../../shared_widgets/common_widgets.dart';
import '../../../shared_widgets/dialog_helpers.dart';

class MarketplaceLandingScreen extends StatefulWidget {
  const MarketplaceLandingScreen({super.key});

  @override
  State<MarketplaceLandingScreen> createState() =>
      _MarketplaceLandingScreenState();
}

class _MarketplaceLandingScreenState extends State<MarketplaceLandingScreen> {
  final TextEditingController _searchController = TextEditingController();

  // Color constants
  static const Color primaryYellow = Color(0xFFFFC107);

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _handleSearch() {
    HapticFeedback.lightImpact();
    DialogHelpers.showSearchDialog(context);
  }

  void _handleCategoryTap(String category) {
    HapticFeedback.lightImpact();
    DialogHelpers.showCategoryDialog(context, category);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GradientBackground(
        child: ResponsiveLayout(
          mobile: _buildMobileLayout(),
          tablet: _buildTabletLayout(),
          desktop: _buildDesktopLayout(),
        ),
      ),
    );
  }

  Widget _buildMobileLayout() {
    return CustomScrollView(
      slivers: [
        // App Bar
        SliverToBoxAdapter(
          child: FadeInAnimation(
            child: _buildAppBar(isMobile: true),
          ),
        ),

        // Hero Section
        SliverToBoxAdapter(
          child: FadeInAnimation(
            delay: const Duration(milliseconds: 200),
            child: _buildHeroSection(isMobile: true),
          ),
        ),

        // Search Section
        SliverToBoxAdapter(
          child: FadeInAnimation(
            delay: const Duration(milliseconds: 400),
            child: _buildSearchSection(isMobile: true),
          ),
        ),

        // Categories Section
        SliverToBoxAdapter(
          child: FadeInAnimation(
            delay: const Duration(milliseconds: 600),
            child: _buildCategoriesSection(isMobile: true),
          ),
        ),

        // Features Section
        SliverToBoxAdapter(
          child: FadeInAnimation(
            delay: const Duration(milliseconds: 800),
            child: _buildFeaturesSection(isMobile: true),
          ),
        ),

        // Footer
        SliverToBoxAdapter(
          child: FadeInAnimation(
            delay: const Duration(milliseconds: 1000),
            child: _buildFooter(isMobile: true),
          ),
        ),
      ],
    );
  }

  Widget _buildTabletLayout() {
    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
            child: FadeInAnimation(child: _buildAppBar(isMobile: false))),
        SliverToBoxAdapter(
            child: FadeInAnimation(
                delay: const Duration(milliseconds: 200),
                child: _buildHeroSection(isMobile: false))),
        SliverToBoxAdapter(
            child: FadeInAnimation(
                delay: const Duration(milliseconds: 400),
                child: _buildSearchSection(isMobile: false))),
        SliverToBoxAdapter(
            child: FadeInAnimation(
                delay: const Duration(milliseconds: 600),
                child: _buildCategoriesSection(isMobile: false))),
        SliverToBoxAdapter(
            child: FadeInAnimation(
                delay: const Duration(milliseconds: 800),
                child: _buildFeaturesSection(isMobile: false))),
        SliverToBoxAdapter(
            child: FadeInAnimation(
                delay: const Duration(milliseconds: 1000),
                child: _buildFooter(isMobile: false))),
      ],
    );
  }

  Widget _buildDesktopLayout() {
    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
            child: FadeInAnimation(child: _buildAppBar(isMobile: false))),
        SliverToBoxAdapter(
            child: FadeInAnimation(
                delay: const Duration(milliseconds: 200),
                child: _buildHeroSection(isMobile: false))),
        SliverToBoxAdapter(
            child: FadeInAnimation(
                delay: const Duration(milliseconds: 400),
                child: _buildSearchSection(isMobile: false))),
        SliverToBoxAdapter(
            child: FadeInAnimation(
                delay: const Duration(milliseconds: 600),
                child: _buildCategoriesSection(isMobile: false))),
        SliverToBoxAdapter(
            child: FadeInAnimation(
                delay: const Duration(milliseconds: 800),
                child: _buildFeaturesSection(isMobile: false))),
        SliverToBoxAdapter(
            child: FadeInAnimation(
                delay: const Duration(milliseconds: 1000),
                child: _buildFooter(isMobile: false))),
      ],
    );
  }

  Widget _buildAppBar({required bool isMobile}) {
    return GlassmorphismContainer(
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? 20 : 40,
        vertical: 16,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Logo
          Row(
            children: [
              Icon(
                Icons.local_shipping_rounded,
                size: isMobile ? 28 : 32,
                color: primaryYellow,
              ),
              SizedBox(width: isMobile ? 8 : 12),
              Text(
                'GoSender',
                style: TextStyle(
                  fontSize: isMobile ? 20 : 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ],
          ),

          // Auth Buttons
          if (!isMobile) ...[
            Row(
              children: [
                AnimatedButton(
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    context.go('/auth/login');
                  },
                  backgroundColor: Colors.transparent,
                  foregroundColor: Colors.white,
                  child: const Text('Login'),
                ),
                const SizedBox(width: 12),
                AnimatedButton(
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    context.go('/auth/register');
                  },
                  child: const Text('Sign Up'),
                ),
              ],
            ),
          ] else ...[
            PopupMenuButton<String>(
              icon: const Icon(Icons.menu, color: Colors.white),
              onSelected: (value) {
                HapticFeedback.lightImpact();
                if (value == 'login') {
                  context.go('/auth/login');
                } else if (value == 'register') {
                  context.go('/auth/register');
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'login',
                  child: Text('Login'),
                ),
                const PopupMenuItem(
                  value: 'register',
                  child: Text('Sign Up'),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildHeroSection({required bool isMobile}) {
    return Padding(
      padding: EdgeInsets.all(isMobile ? 20 : 80),
      child: GlassmorphismContainer(
        padding: EdgeInsets.all(isMobile ? 24 : 48),
        child: Column(
          children: [
            Icon(
              Icons.local_shipping_rounded,
              size: isMobile ? 64 : 80,
              color: primaryYellow,
            ),
            SizedBox(height: isMobile ? 20 : 24),
            Text(
              'Welcome to GoSender',
              style: TextStyle(
                fontSize: isMobile ? 28 : 36,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: isMobile ? 12 : 16),
            Text(
              'Your trusted delivery platform connecting customers, vendors, and delivery agents for seamless service experiences.',
              style: TextStyle(
                fontSize: isMobile ? 16 : 18,
                color: Colors.white.withOpacity(0.9),
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: isMobile ? 24 : 32),

            // CTA Buttons
            if (isMobile) ...[
              Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    child: AnimatedButton(
                      onPressed: () {
                        HapticFeedback.mediumImpact();
                        context.go('/auth/register');
                      },
                      height: 50,
                      child: const Text(
                        'Get Started',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: AnimatedButton(
                      onPressed: () => HapticFeedback.lightImpact(),
                      backgroundColor: Colors.transparent,
                      foregroundColor: Colors.white,
                      child: const Text('Learn More'),
                    ),
                  ),
                ],
              ),
            ] else ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  AnimatedButton(
                    onPressed: () {
                      HapticFeedback.mediumImpact();
                      context.go('/auth/register');
                    },
                    padding: const EdgeInsets.symmetric(
                        horizontal: 32, vertical: 16),
                    child: const Text(
                      'Get Started',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  AnimatedButton(
                    onPressed: () => HapticFeedback.lightImpact(),
                    backgroundColor: Colors.transparent,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 32, vertical: 16),
                    child: const Text('Learn More'),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSearchSection({required bool isMobile}) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: isMobile ? 20 : 80),
      child: GlassmorphismContainer(
        padding: EdgeInsets.all(isMobile ? 20 : 24),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _searchController,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'Search for services...',
                  hintStyle: TextStyle(
                    color: Colors.white.withOpacity(0.6),
                    fontSize: isMobile ? 14 : 16,
                  ),
                  border: InputBorder.none,
                  prefixIcon: Icon(
                    Icons.search,
                    color: Colors.white.withOpacity(0.7),
                  ),
                ),
              ),
            ),
            AnimatedButton(
              onPressed: _handleSearch,
              child: Text(
                'Search',
                style: TextStyle(
                  fontSize: isMobile ? 14 : 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoriesSection({required bool isMobile}) {
    final categories = [
      {'name': 'Food Delivery', 'icon': Icons.restaurant},
      {'name': 'Package Delivery', 'icon': Icons.inbox},
      {'name': 'Document Delivery', 'icon': Icons.description},
      {'name': 'Medical Delivery', 'icon': Icons.medical_services},
      {'name': 'Grocery Delivery', 'icon': Icons.shopping_cart},
      {'name': 'Express Delivery', 'icon': Icons.flash_on},
    ];

    return Padding(
      padding: EdgeInsets.all(isMobile ? 20 : 80),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Our Services',
            style: TextStyle(
              fontSize: isMobile ? 24 : 32,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          SizedBox(height: isMobile ? 20 : 32),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount:
                  isMobile ? 2 : (ResponsiveLayout.isDesktop(context) ? 3 : 3),
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              childAspectRatio: 1.1,
            ),
            itemCount: categories.length,
            itemBuilder: (context, index) {
              final category = categories[index];
              return AnimatedButton(
                onPressed: () => _handleCategoryTap(category['name'] as String),
                child: GlassmorphismContainer(
                  padding: EdgeInsets.all(isMobile ? 16 : 20),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        category['icon'] as IconData,
                        size: isMobile ? 32 : 40,
                        color: primaryYellow,
                      ),
                      SizedBox(height: isMobile ? 8 : 12),
                      Text(
                        category['name'] as String,
                        style: TextStyle(
                          fontSize: isMobile ? 12 : 14,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildFeaturesSection({required bool isMobile}) {
    final features = [
      {
        'title': 'Fast Delivery',
        'description': 'Quick and reliable delivery services',
        'icon': Icons.speed,
      },
      {
        'title': 'Real-time Tracking',
        'description': 'Track your orders in real-time',
        'icon': Icons.location_on,
      },
      {
        'title': 'Secure Payments',
        'description': 'Safe and secure payment options',
        'icon': Icons.security,
      },
      {
        'title': '24/7 Support',
        'description': 'Round-the-clock customer support',
        'icon': Icons.support_agent,
      },
    ];

    return Padding(
      padding: EdgeInsets.all(isMobile ? 20 : 80),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Why Choose GoSender?',
            style: TextStyle(
              fontSize: isMobile ? 24 : 32,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          SizedBox(height: isMobile ? 20 : 32),
          if (isMobile) ...[
            Column(
              children: features
                  .map(
                    (feature) => Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: _buildFeatureCard(feature, isMobile: true),
                    ),
                  )
                  .toList(),
            ),
          ] else ...[
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 20,
                mainAxisSpacing: 20,
                childAspectRatio: 1.5,
              ),
              itemCount: features.length,
              itemBuilder: (context, index) =>
                  _buildFeatureCard(features[index], isMobile: false),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFeatureCard(Map<String, dynamic> feature,
      {required bool isMobile}) {
    return GlassmorphismContainer(
      padding: EdgeInsets.all(isMobile ? 20 : 24),
      child: Row(
        children: [
          Icon(
            feature['icon'] as IconData,
            size: isMobile ? 32 : 40,
            color: primaryYellow,
          ),
          SizedBox(width: isMobile ? 16 : 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  feature['title'] as String,
                  style: TextStyle(
                    fontSize: isMobile ? 16 : 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                SizedBox(height: isMobile ? 4 : 8),
                Text(
                  feature['description'] as String,
                  style: TextStyle(
                    fontSize: isMobile ? 14 : 16,
                    color: Colors.white.withOpacity(0.8),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFooter({required bool isMobile}) {
    return Padding(
      padding: EdgeInsets.all(isMobile ? 20 : 80),
      child: GlassmorphismContainer(
        padding: EdgeInsets.all(isMobile ? 24 : 40),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.local_shipping_rounded,
                  size: isMobile ? 24 : 32,
                  color: primaryYellow,
                ),
                SizedBox(width: isMobile ? 8 : 12),
                Text(
                  'GoSender',
                  style: TextStyle(
                    fontSize: isMobile ? 20 : 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
            SizedBox(height: isMobile ? 16 : 20),
            Text(
              'Connecting people, delivering possibilities.',
              style: TextStyle(
                fontSize: isMobile ? 14 : 16,
                color: Colors.white.withOpacity(0.8),
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: isMobile ? 16 : 20),
            Text(
              '© 2024 GoSender. All rights reserved.',
              style: TextStyle(
                fontSize: isMobile ? 12 : 14,
                color: Colors.white.withOpacity(0.6),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
