# GoSenderr v2 - Testing Guide

## 🧪 Quick Start Testing

### Prerequisites
1. Dev server running on http://localhost:3000 ✅ (already running)
2. Two browser windows/profiles:
   - **Window 1**: Regular browser (Customer)
   - **Window 2**: Incognito/Private mode (Courier)

---

## 🎬 Test Script

### Step 1: Customer Setup (Window 1)
```
1. Open: http://localhost:3000/v2/login
2. Sign in: customer@test.com / password123
3. Select role: Customer 📦
4. You'll be redirected to: /v2/customer/jobs
```

### Step 2: Courier Setup (Window 2 - Incognito)
```
1. Open: http://localhost:3000/v2/login (in incognito)
2. Sign in: courier@test.com / password123
3. Select role: Courier 🚗
4. Set up rate card:
   - Transport: Car
   - Base Fee: $5.00
   - Per Mile: $1.50
   - Toggle: ✅ Online (IMPORTANT - enables location tracking)
5. Click "Go to Dashboard"
```

### Step 3: Create Job (Window 1 - Customer)
```
1. Click "Create New Job"
2. Enter test coordinates:

   📍 Pickup (San Francisco Downtown):
   - Label: "Downtown Office"
   - Latitude: 37.7749
   - Longitude: -122.4194

   📍 Dropoff (Fisherman's Wharf):
   - Label: "Waterfront"
   - Latitude: 37.8083
   - Longitude: -122.4108

3. Click "Create Job"
4. You'll see the job detail page with map
5. Status shows: OPEN (gray badge)
```

### Step 4: Accept Job (Window 2 - Courier)
```
1. Refresh dashboard if needed
2. You should see the new job in the list
3. Click on the job card
4. Preview panel shows:
   - Distance: ~2.5 miles
   - Estimated Fee: ~$8.75
5. Click "Accept Job"
6. You'll be redirected to the active job page
7. Status shows: ASSIGNED (blue badge)
```

### Step 5: Watch Live Updates (Window 1 - Customer)
```
1. Customer job detail page automatically updates!
2. You should now see:
   - Status: ASSIGNED (blue)
   - Delivery Fee: $8.75
   - Courier Status: 🟢 Online
   - Blue courier marker on map (if location permission granted)
```

### Step 6: Progress Delivery (Window 2 - Courier)
```
1. Click "Start Pickup" → Status: EN ROUTE TO PICKUP (purple)
2. Click "Navigate 🗺️" to open Google Maps for pickup location
3. Click "Mark Picked Up" → Status: PICKED UP (orange)
4. Click "Start Delivery" → Status: EN ROUTE TO DROPOFF (red)
5. Click "Navigate 🗺️" to open Google Maps for dropoff location
6. Click "Mark Delivered" → Status: DELIVERED (green)
7. Auto-redirected to dashboard
```

### Step 7: Verify Completion (Window 1 - Customer)
```
1. Job detail page shows: DELIVERED (green badge)
2. All status changes happened in real-time!
3. Go back to "My Jobs" list
4. Job shows as DELIVERED with fee $8.75
```

---

## 🗺️ More Test Coordinates

### New York City
```
Pickup (Times Square):
Lat: 40.7580, Lng: -73.9855

Dropoff (Central Park):
Lat: 40.7829, Lng: -73.9654
```

### Los Angeles
```
Pickup (Downtown LA):
Lat: 34.0522, Lng: -118.2437

Dropoff (Santa Monica):
Lat: 34.0195, Lng: -118.4912
```

### Chicago
```
Pickup (Loop):
Lat: 41.8781, Lng: -87.6298

Dropoff (Navy Pier):
Lat: 41.8917, Lng: -87.6086
```

### Short Distance Test
```
Pickup: 37.7749, -122.4194
Dropoff: 37.7749, -122.4144
Distance: ~0.3 miles
Fee: ~$5.45 (mostly base fee)
```

---

## 🐛 Troubleshooting

### Issue: "No open jobs available"
**Solution**: Make sure customer created a job first, and it shows status "OPEN"

### Issue: "Failed to claim job"
**Solution**: Another courier may have claimed it. Jobs can only be claimed once (atomic transaction).

### Issue: "Map not showing"
**Solution**: 
1. Check if NEXT_PUBLIC_MAPBOX_TOKEN is set in .env.local
2. Map will show fallback with coordinates if token is missing
3. Get token from https://account.mapbox.com/access-tokens/

### Issue: "Courier location not showing on customer map"
**Solution**:
1. Make sure courier toggled "Online" in setup
2. Browser must grant location permission
3. Wait 5 seconds for first location write
4. Check browser console for geolocation errors

### Issue: "Jobs not updating in real-time"
**Solution**: 
1. Check browser console for Firestore errors
2. Verify Firebase credentials in .env.local
3. Hard refresh both windows (Cmd+Shift+R / Ctrl+Shift+R)

---

## ✅ Expected Behavior Checklist

- [ ] Customer can sign in/create account
- [ ] Customer can select "Customer" role
- [ ] Customer can create job with coordinates
- [ ] Job appears in customer's "My Jobs" list
- [ ] Job detail shows map with green/red markers
- [ ] Courier can sign in/create account
- [ ] Courier can select "Courier" role
- [ ] Courier can set rate card and go online
- [ ] Courier dashboard shows open jobs
- [ ] Courier can click job to see preview
- [ ] Preview shows distance and fee calculation
- [ ] Courier can accept job (only once across all couriers)
- [ ] Customer sees instant status change to "ASSIGNED"
- [ ] Customer sees agreed fee amount
- [ ] Customer sees courier online status
- [ ] Customer map shows blue courier marker (if online)
- [ ] Courier can progress through all statuses
- [ ] Each status button changes correctly
- [ ] Google Maps links work for navigation
- [ ] Delivered status shows completion message
- [ ] All updates happen in real-time without refresh

---

## 🎯 Performance Tips

1. **Keep courier online**: Location updates only happen when online
2. **Allow location permissions**: Required for live tracking
3. **Use incognito for second user**: Prevents session conflicts
4. **Test with short distances first**: Easier to verify calculations
5. **Check Network tab**: See real-time Firestore updates in DevTools

---

## 📊 Sample Output

### Fee Calculation Examples
```
Rate Card: $5 base + $1.50/mile

Distance  | Calculation      | Total Fee
----------|------------------|----------
0.5 mi    | $5 + (0.5×$1.5) | $5.75
1.0 mi    | $5 + (1.0×$1.5) | $6.50
2.5 mi    | $5 + (2.5×$1.5) | $8.75
5.0 mi    | $5 + (5.0×$1.5) | $12.50
10.0 mi   | $5 + (10×$1.5)  | $20.00
```

---

## 🚀 Ready to Test!

Open two browser windows and follow the test script above. Everything should work out of the box!

**Quick URLs:**
- Landing: http://localhost:3000/v2
- Login: http://localhost:3000/v2/login
- Customer Jobs: http://localhost:3000/v2/customer/jobs
- Courier Dashboard: http://localhost:3000/v2/courier/dashboard
