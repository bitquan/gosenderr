import UIKit
import UserNotifications
import FirebaseCore
import FirebaseMessaging
import React
import React_RCTAppDelegate
#if canImport(ReactAppDependencyProvider)
import ReactAppDependencyProvider
#endif

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate, RCTBridgeDelegate {
  var window: UIWindow?
  private let pushTokenDefaultsKey = "SenderrPushDeviceToken"
  private let fcmTokenDefaultsKey = "SenderrFCMToken"

  override init() {
    super.init()
    configureFirebaseIfAvailable()
  }

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    configureFirebaseIfAvailable()
    Messaging.messaging().delegate = self
    UNUserNotificationCenter.current().delegate = self
    requestPushNotificationAuthorization(application: application)

    window = UIWindow(frame: UIScreen.main.bounds)

    guard let bridge = RCTBridge(delegate: self, launchOptions: launchOptions) else {
      return false
    }

    let rootView = RCTRootView(
      bridge: bridge,
      moduleName: "Senderrappios",
      initialProperties: buildRuntimeInitialProperties()
    )
    let rootViewController = UIViewController()
    rootViewController.view = rootView
    window?.rootViewController = rootViewController
    window?.makeKeyAndVisible()

    return true
  }

  private func requestPushNotificationAuthorization(application: UIApplication) {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) {
      granted,
      error in
      if let error {
        NSLog("Push permission request failed: \(error.localizedDescription)")
        return
      }

      if !granted {
        NSLog("Push permission denied by user.")
        return
      }

      DispatchQueue.main.async {
        application.registerForRemoteNotifications()
      }
    }
  }

  private func configureFirebaseIfAvailable() {
    guard FirebaseApp.app() == nil else {
      return
    }

    // Prefer explicit GoogleService-Info.plist in app bundle
    if hasUsableGoogleServicePlist() {
      FirebaseApp.configure()
      Messaging.messaging().delegate = self
      return
    }

    if hasGoogleServicePlist() {
      NSLog(
        "Firebase disabled: GoogleService-Info.plist is present but invalid (placeholder or malformed GOOGLE_APP_ID)."
      )
    }

    // Fallback: try configuring from Info.plist overrides (safe for local dev without committing secrets)
    if let appId = readInfoValue("SenderrFirebaseAppId"),
       let apiKey = readInfoValue("SenderrFirebaseApiKey"),
       let projectId = readInfoValue("SenderrFirebaseProjectId") {
      let senderId = readInfoValue("SenderrFirebaseMessagingSenderId") ?? ""
      let options = FirebaseOptions(googleAppID: appId, gcmSenderID: senderId)
      options.apiKey = apiKey
      options.projectID = projectId
      if let storageBucket = readInfoValue("SenderrFirebaseStorageBucket") {
        options.storageBucket = storageBucket
      }
      FirebaseApp.configure(options: options)
      Messaging.messaging().delegate = self
      NSLog("Firebase configured from Info.plist overrides for target Senderrappios.")
      return
    }

    NSLog(
      "Firebase disabled: GoogleService-Info.plist is missing and no Info.plist overrides found for target Senderrappios."
    )
  }

  private func buildRuntimeInitialProperties() -> [String: Any] {
    let isDebugBuild = _isDebugAssertConfiguration()
    let envName = readInfoValue("SenderrEnvName") ?? (isDebugBuild ? "dev" : "prod")
    let apiBaseUrl = normalizedAPIBaseURL(readInfoValue("SenderrApiBaseUrl") ?? defaultApiBaseURL(for: envName))
    // Keep JS Firebase config internally consistent by preferring one source:
    // GoogleService-Info.plist (if present) first, then Info.plist overrides, then defaults.
    let firebaseProjectID =
      readGoogleServiceValue("PROJECT_ID")
      ?? readInfoValue("SenderrFirebaseProjectId")
      ?? defaultFirebaseProjectID(for: envName)
    let firebaseAuthDomain =
      defaultFirebaseAuthDomain(for: firebaseProjectID)
      ?? readInfoValue("SenderrFirebaseAuthDomain")
      ?? defaultFirebaseAuthDomain(for: envName)
    let firebaseStorageBucket =
      readGoogleServiceValue("STORAGE_BUCKET")
      ?? readInfoValue("SenderrFirebaseStorageBucket")
      ?? defaultFirebaseStorageBucket(for: envName)
    let mapboxAccessToken = readInfoValue("SenderrMapboxAccessToken") ?? readInfoValue("MBXAccessToken") ?? ""
    let mapProvider = readInfoValue("SenderrMapProvider") ?? (mapboxAccessToken.isEmpty ? "native" : "mapbox")

    let firebase: [String: String] = [
      "apiKey": readGoogleServiceValue("API_KEY") ?? readInfoValue("SenderrFirebaseApiKey") ?? "",
      "authDomain": firebaseAuthDomain,
      "projectId": firebaseProjectID,
      "storageBucket": firebaseStorageBucket,
      "messagingSenderId": readGoogleServiceValue("GCM_SENDER_ID")
        ?? readInfoValue("SenderrFirebaseMessagingSenderId")
        ?? "",
      "appId": readGoogleServiceValue("GOOGLE_APP_ID") ?? readInfoValue("SenderrFirebaseAppId") ?? "",
    ]

    return [
      "runtimeConfig": [
        "envName": envName,
        "apiBaseUrl": apiBaseUrl,
        "firebase": firebase,
        "maps": [
          "provider": mapProvider,
          "mapboxAccessToken": mapboxAccessToken,
        ],
      ],
    ]
  }

  private func readInfoValue(_ key: String) -> String? {
    guard let raw = Bundle.main.object(forInfoDictionaryKey: key) as? String else {
      return nil
    }
    let value = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    if value.isEmpty || value.hasPrefix("$(") {
      return nil
    }
    return value
  }

  private func defaultApiBaseURL(for env: String) -> String {
    switch env.lowercased() {
    case "prod", "production":
      return "https://api.gosenderr.com"
    case "staging":
      return "https://staging-api.gosenderr.com"
    default:
      return "https://dev-api.gosenderr.com"
    }
  }

  private func normalizedAPIBaseURL(_ value: String) -> String {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.hasPrefix("http://") || trimmed.hasPrefix("https://") {
      return trimmed
    }
    return "https://\(trimmed)"
  }

  private func defaultFirebaseProjectID(for env: String) -> String {
    switch env.lowercased() {
    case "prod", "production":
      return "gosenderr-6773f"
    case "staging":
      return "gosenderr-staging"
    default:
      return "gosenderr-dev"
    }
  }

  private func defaultFirebaseAuthDomain(for env: String) -> String {
    return "\(defaultFirebaseProjectID(for: env)).firebaseapp.com"
  }

  private func defaultFirebaseAuthDomain(for projectID: String) -> String? {
    let trimmed = projectID.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.isEmpty {
      return nil
    }
    return "\(trimmed).firebaseapp.com"
  }

  private func defaultFirebaseStorageBucket(for env: String) -> String {
    return "\(defaultFirebaseProjectID(for: env)).appspot.com"
  }

  private func readGoogleServiceValue(_ key: String) -> String? {
    guard hasUsableGoogleServicePlist(),
      let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
      let dictionary = NSDictionary(contentsOfFile: path),
      let raw = dictionary[key] as? String
    else {
      return nil
    }

    let value = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    if value.isEmpty {
      return nil
    }
    return value
  }

  private func hasGoogleServicePlist() -> Bool {
    Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil
  }

  private func hasUsableGoogleServicePlist() -> Bool {
    guard let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
      let dictionary = NSDictionary(contentsOfFile: path),
      let rawAppID = dictionary["GOOGLE_APP_ID"] as? String
    else {
      return false
    }

    let appID = rawAppID.trimmingCharacters(in: .whitespacesAndNewlines)
    if appID.isEmpty || appID.localizedCaseInsensitiveContains("placeholder") {
      return false
    }

    let parts = appID.split(separator: ":")
    if parts.count != 4 {
      return false
    }

    if !parts[0].allSatisfy({ $0.isNumber }) || !parts[1].allSatisfy({ $0.isNumber }) {
      return false
    }

    if parts[2] != "ios" || parts[3].isEmpty {
      return false
    }

    if let plistBundleID = dictionary["BUNDLE_ID"] as? String,
      let appBundleID = Bundle.main.bundleIdentifier
    {
      let normalizedPlistBundleID = plistBundleID.trimmingCharacters(in: .whitespacesAndNewlines)
      if !normalizedPlistBundleID.isEmpty && normalizedPlistBundleID != appBundleID {
        return false
      }
    }

    return true
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([.banner, .sound, .badge])
  }

  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    Messaging.messaging().apnsToken = deviceToken
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    UserDefaults.standard.set(token, forKey: pushTokenDefaultsKey)
    NSLog("APNs device token registered.")
  }

  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    NSLog("APNs registration failed: \(error.localizedDescription)")
  }

  func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    guard let fcmToken, !fcmToken.isEmpty else {
      return
    }
    UserDefaults.standard.set(fcmToken, forKey: fcmTokenDefaultsKey)
    NSLog("FCM token refreshed.")
  }

  // MARK: - RCTBridgeDelegate
  func sourceURL(for bridge: RCTBridge) -> URL? {
#if DEBUG
    let provider = RCTBundleURLProvider.sharedSettings()
    if provider.jsLocation == nil || provider.jsLocation?.isEmpty == true || provider.jsLocation == "localhost" ||
      provider.jsLocation == "127.0.0.1"
    {
      provider.jsLocation = ProcessInfo.processInfo.environment["METRO_HOST"] ?? "192.168.0.76"
    }
    return provider.jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
