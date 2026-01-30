# Port Assignments

To avoid conflicts, each app has a dedicated port:

| App | Port | URL |
|-----|------|-----|
| **Admin App** | 3000 | http://localhost:3000 |
| **Courier App** | 3001 | http://localhost:3001 |
| **Customer App** | 3002 | http://localhost:3002 |
| **Web (Next.js)** | 3003 | http://localhost:3003 |
| **Customer App (Alt)** | 3005 | http://localhost:3005 |

## Configuration

All Vite apps use `strictPort: true` to fail immediately if the port is taken, rather than silently using a different port.

## Running Apps

```bash
# Run all apps
pnpm dev

# Or run individually
cd apps/admin-app && pnpm dev     # Port 3000
cd apps/courier-app && pnpm dev   # Port 3001
cd apps/marketplace-app && pnpm dev  # Port 3002
cd apps/web && pnpm dev           # Port 3003
```

## Important

**Always check which port you're viewing!** The app on port 3000 is the **Admin App**, not courier-app.
