import UIKit
import UserNotifications
import FirebaseCore
import React
import React_RCTAppDelegate
#if canImport(ReactAppDependencyProvider)
import ReactAppDependencyProvider
#endif

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, RCTBridgeDelegate {
  var window: UIWindow?

  override init() {
    super.init()
    configureFirebaseIfAvailable()
  }

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    configureFirebaseIfAvailable()
    UNUserNotificationCenter.current().delegate = self
    application.registerForRemoteNotifications()

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

  private func configureFirebaseIfAvailable() {
    guard FirebaseApp.app() == nil else {
      return
    }

    if Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil {
      FirebaseApp.configure()
    } else {
      NSLog(
        "Firebase disabled: GoogleService-Info.plist is missing from app bundle for target Senderrappios."
      )
    }
  }

  private func buildRuntimeInitialProperties() -> [String: Any] {
    let isDebugBuild = _isDebugAssertConfiguration()
    let envName = readInfoValue("SenderrEnvName") ?? (isDebugBuild ? "dev" : "prod")
    let apiBaseUrl = normalizedAPIBaseURL(readInfoValue("SenderrApiBaseUrl") ?? defaultApiBaseURL(for: envName))

    let firebase: [String: String] = [
      "apiKey": readInfoValue("SenderrFirebaseApiKey") ?? "",
      "authDomain": readInfoValue("SenderrFirebaseAuthDomain") ?? defaultFirebaseAuthDomain(for: envName),
      "projectId": readInfoValue("SenderrFirebaseProjectId") ?? defaultFirebaseProjectID(for: envName),
      "storageBucket": readInfoValue("SenderrFirebaseStorageBucket") ?? defaultFirebaseStorageBucket(for: envName),
      "messagingSenderId": readInfoValue("SenderrFirebaseMessagingSenderId") ?? "",
      "appId": readInfoValue("SenderrFirebaseAppId") ?? "",
    ]

    return [
      "runtimeConfig": [
        "envName": envName,
        "apiBaseUrl": apiBaseUrl,
        "firebase": firebase,
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

  private func defaultFirebaseStorageBucket(for env: String) -> String {
    return "\(defaultFirebaseProjectID(for: env)).appspot.com"
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([])
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
