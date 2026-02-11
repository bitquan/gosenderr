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

    let rootView = RCTRootView(bridge: bridge, moduleName: "Senderr", initialProperties: nil)
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
        "Firebase disabled: GoogleService-Info.plist is missing from app bundle for target Senderr."
      )
    }
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
      if let metroHost = ProcessInfo.processInfo.environment["METRO_HOST"], !metroHost.isEmpty {
        provider.jsLocation = metroHost
      }
    }
    return provider.jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
