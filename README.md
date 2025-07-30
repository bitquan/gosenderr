# GoSender - Delivery Platform

A comprehensive Flutter web application for delivery and marketplace services, supporting multiple user roles including customers, vendors, delivery agents, and administrators.

## 🚀 Live Demo

The application is deployed and available at: **https://bitquan.github.io/gosenderr/**

## ✨ Features

### Multi-Role Authentication
- **Customer**: Browse products, place orders, track deliveries
- **Vendor**: Manage inventory, process orders, view analytics
- **Delivery Agent**: Accept deliveries, track earnings, manage availability
- **Admin**: Platform oversight, user management, system analytics

### Modern UI/UX
- Material 3 design system
- Responsive web design
- Light/Dark theme support
- Intuitive navigation with role-based dashboards

### Technical Features
- Built with Flutter 3.24+ for web
- GoRouter for type-safe navigation
- Form validation and user input handling
- Modular architecture for easy maintenance

## 🛠 Technology Stack

- **Frontend**: Flutter Web
- **UI Framework**: Material 3
- **Navigation**: GoRouter
- **State Management**: StatefulWidget (simplified for demo)
- **Deployment**: GitHub Pages with automated CI/CD

## 🚀 Getting Started

### Prerequisites
- Flutter SDK 3.24 or higher
- Web browser with modern JavaScript support

### Local Development
```bash
# Clone the repository
git clone https://github.com/bitquan/gosenderr.git
cd gosenderr

# Install dependencies
flutter pub get

# Run the web app locally
flutter run -d web-server --web-port 8080
```

### Building for Production
```bash
# Build the web app
flutter build web --release

# The built files will be in build/web/
```

## 📁 Project Structure

```
lib/
├── core/
│   ├── constants/          # App constants and configuration
│   └── theme/              # Material 3 theme setup
├── features/
│   ├── auth/               # Authentication screens
│   ├── customer/           # Customer dashboard and features
│   ├── vendor/             # Vendor management screens
│   ├── delivery_agent/     # Delivery agent interface
│   └── admin/              # Admin dashboard
├── shared_widgets/         # Reusable UI components
└── l10n/                   # Internationalization support
```

## 🎯 User Roles & Capabilities

### Customer Dashboard
- Quick actions for shipping and shopping
- Order tracking and history
- User-friendly interface for marketplace browsing

### Vendor Dashboard
- Store status management
- Order processing workflow
- Revenue and analytics tracking
- Product inventory management

### Delivery Agent Dashboard
- Delivery queue management
- Earnings tracking
- Availability toggle
- Route optimization tools

### Admin Dashboard
- Platform-wide analytics
- User management across all roles
- System monitoring and configuration
- Support and dispute resolution

## 🚀 Deployment

The application is automatically deployed to GitHub Pages using GitHub Actions. Every push to the main branch triggers a new deployment.

### Manual Deployment
You can also deploy to other platforms:

- **Netlify**: Drag and drop the `build/web` folder
- **Vercel**: Connect your GitHub repository
- **Firebase Hosting**: Use `firebase deploy`

## 📝 Development Notes

This is a demonstration application showcasing Flutter web capabilities with a focus on:
- Clean architecture and code organization
- Modern Flutter development practices
- Responsive design principles
- Multi-role user interface design

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Flutter team for the amazing web support
- Material Design team for the design system
- GitHub Pages for free hosting
