# Senderr App - Local Development

## 🚚 Access Senderr Portal

**Local Development Server:** http://localhost:5174

Already running in your terminal!

---

## 🔐 Login Options

### Option 1: Create New Senderr Account
1. Open http://localhost:3001
2. You'll see the login page
3. Use the same email/password you used for marketplace app
4. The system will use your existing account

### Option 2: Use Existing Account
- Use the same credentials from marketplace app
- The auth is shared across both portals

---

## 🎯 Features Available

### Dashboard (Current Page)
- **Online/Offline Toggle** - Green button in header
- **Available Jobs** - List of open delivery jobs
- **My Active Deliveries** - Jobs you've accepted
- **Stats**: Available, Active, Vehicle Type

### How to Use
1. Click "Go Online" button (turns green)
2. Browse available jobs below
3. Click "Accept Job" to claim a delivery
4. View your active deliveries at the top

---

## 🚀 Development

### Start Dev Server
\`\`\`bash
cd apps/senderr-app
pnpm dev
\`\`\`

### Build for Production
\`\`\`bash
pnpm build
\`\`\`

### Port
- Default: 5174
- Hot reload enabled ⚡

---

## 📂 Project Structure

\`\`\`
apps/senderr-app/
├── src/
│   ├── pages/
│   │   ├── Login.tsx        # Auth page
│   │   └── Dashboard.tsx    # Main senderr dashboard
│   ├── components/         # Shared UI components
│   ├── lib/                # Firebase, utils
│   ├── contexts/           # Auth context
│   └── hooks/              # Custom hooks
└── dist/                   # Build output
\`\`\`

---

## 🔧 Next Steps

- [ ] Job Detail page (accept/update status)
- [ ] Active Route page (navigation)
- [ ] Jobs history
- [ ] Profile/Settings
- [ ] Deploy to Firebase Hosting

---

## 📱 Related Apps

- **Marketplace App (Deployed)**: https://gosenderr-marketplace.web.app
- **Marketplace App (Local)**: Run \`pnpm dev\` in \`apps/marketplace-app\`
