Here's a detailed flow of the **Courier App** in the GoSenderr repository, derived from the repository's available information:

---

### **Courier App Flow**
The Courier App follows a map-first design philosophy, built to facilitate delivery job management with real-time updates. Below is the step-by-step operational flow:

#### 1. **Authentication and Setup**
   - **User Signs In**: Authentication is handled using Firebase (Phone Authentication with optional Email fallback). Each courier is assigned the "courier" role in their Firestore document.
   - Onboarding steps include:
     - Providing vehicle information.
     - Verifying identity and uploading required documents.

---

#### 2. **Main Dashboard View**
   - **Full-Screen Map**: 
     - Firestore is queried to show all available jobs within the courier's geolocation (e.g., jobs with status "open" and nearby geohashes).
     - Job markers are rendered on the map dynamically in real-time.
   - **Floating Controls**:
     - UI such as a swipeable job details card, dashboard navigation, and real-time status updates float over the map.

---

#### 3. **Job Browsing and Selection**
   - Couriers browse available jobs on the map.
   - **Marker Details**: Tapping on a map marker opens a floating card with job details like:
     - Pickup/Dropoff locations.
     - Estimated mileage.
     - Payout amount.
   - **Accept Job**: When a courier accepts, the app makes a call to a `claimJob` Cloud Function:
     - Verifies the job's current status as "open."
     - Updates Firestore to assign the job to the courier.
     - Updates the job status to "assigned."

---

#### 4. **Job Fulfillment Process**
   - **Turn-by-Turn Navigation**:
     - Mapbox integration provides live navigation to pickup/dropoff locations.
   - **Job Status Updates**:
     - Status progression includes transitions like:
       - `assigned` → `enroute_pickup` → `arrived_pickup` → `picked_up` → `enroute_dropoff` → `arrived_dropoff` → `completed`.
     - Updates are sent to Firestore, and customers are notified via push notifications in real time.
   - **Photo Capture**:
     - Proof-of-pickup and proof-of-delivery photos can be taken and uploaded to Firebase Storage.

---

#### 5. **Earnings Management**
   - **Earnings Summary**:
     - Couriers can view completed job payouts, pending earnings, and historical data.
   - **Stripe Connect**:
     - Payouts are processed via Stripe integration. Couriers are onboarded to Stripe Connect to receive direct transfers.

---

### **Key Features**
1. **Real-Time Updates**:
   - Job availability, courier location, and status are all synchronized in real-time using Firestore listeners.
2. **Firebase Integration**:
   - Handles authentication, database storage (jobs and users), cloud functions (job assignments), and storage for proof photos.
3. **Mapbox Integration**:
   - Delivers location tracking with a fully interactive map UI.
4. **Push Notifications**:
   - Built-in push notifications keep customers updated on delivery status.

---

### **Courier-Specific Permissions**
As defined in [User Roles](https://github.com/bitquan/gosenderr/blob/892e83560345bf2959aed89b2ff491ac884388f8/docs/project-plan/02-USER-ROLES-AND-FLOWS.md):
- ✅ View available jobs.
- ✅ Accept jobs.
- ✅ Navigate to pickup/dropoff locations.
- ✅ Update job status in the app.
- ✅ Capture proof photos for deliveries.
- ✅ Track and receive earnings.
- ❌ No access to marketplace order management.

---

### **Next Steps to Optimize**
1. **Testing for Turn-by-Turn Navigation**:
   - Ensure smooth integration with Mapbox for navigation accuracy.
2. **Performance Tuning**:
   - Optimize map rendering to maintain 60 FPS on supported devices.
3. **Verification and Deployment**:
   - Verify iOS App Store submission requirements and ensure adherence to Apple's guidelines.

Would you like assistance with implementing or testing any specific parts of this flow?