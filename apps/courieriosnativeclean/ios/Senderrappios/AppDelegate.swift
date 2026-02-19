import UIKit
import UserNotifications
import FirebaseCore
import FirebaseMessaging
import React
import React_RCTAppDelegate
#if targetEnvironment(simulator)
import Darwin
#endif
#if canImport(ReactAppDependencyProvider)
import ReactAppDependencyProvider
#endif

@main
@objc(AppDelegate)
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {
  var window: UIWindow?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Prevent any RN packager launch/connection attempts on physical devices
    #if !targetEnvironment(simulator)
    setenv("RCT_NO_LAUNCH_PACKAGER", "1", 1)
    NSLog("[AppDelegate] RCT_NO_LAUNCH_PACKAGER=1 (device)")
    #endif

    configureFirebaseIfAvailable()
    Messaging.messaging().delegate = self
    UNUserNotificationCenter.current().delegate = self
    application.registerForRemoteNotifications()

    window = UIWindow(frame: UIScreen.main.bounds)

    guard let jsBundleURL = resolveJSBundleURL() else {
      NSLog("Failed to resolve JS bundle URL")
      return false
    }

    NSLog("[AppDelegate] resolved JS bundle URL: %{public}@", jsBundleURL.absoluteString)


    guard let bridge = RCTBridge(bundleURL: jsBundleURL, moduleProvider: nil, launchOptions: launchOptions) else {
      NSLog("Failed to create React bridge")
      return false
    }

    let rootView = RCTRootView(bridge: bridge, moduleName: "Senderr", initialProperties: nil)
    let rootViewController = UIViewController()
    rootViewController.view = rootView
    window?.rootViewController = rootViewController
    window?.makeKeyAndVisible()

    // Add keyboard event monitoring for input debugging
    NotificationCenter.default.addObserver(self, selector: #selector(keyboardWillShow(_:)), name: UIResponder.keyboardWillShowNotification, object: nil)
    NotificationCenter.default.addObserver(self, selector: #selector(keyboardDidShow(_:)), name: UIResponder.keyboardDidShowNotification, object: nil)
    NotificationCenter.default.addObserver(self, selector: #selector(keyboardWillHide(_:)), name: UIResponder.keyboardWillHideNotification, object: nil)
    NotificationCenter.default.addObserver(self, selector: #selector(keyboardDidHide(_:)), name: UIResponder.keyboardDidHideNotification, object: nil)

    return true
  }

  private func configureFirebaseIfAvailable() {
    guard FirebaseApp.app() == nil else {
      return
    }

    if let plistPath = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
       let options = FirebaseOptions(contentsOfFile: plistPath) {
      FirebaseApp.configure(options: options)
      NSLog("Firebase configured from bundled GoogleService-Info.plist")
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
    if #available(iOS 14.0, *) {
      completionHandler([.banner, .list, .sound, .badge])
    } else {
      completionHandler([.alert, .sound, .badge])
    }
  }

  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    Messaging.messaging().apnsToken = deviceToken
  }

  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    NSLog("APNs registration failed: \(error.localizedDescription)")
  }

  func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    guard let token = fcmToken, !token.isEmpty else { return }
    NSLog("FCM registration token updated: \(token.prefix(12))…")
  }

  func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable : Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    completionHandler(.newData)
  }

  private func resolveJSBundleURL() -> URL? {
#if DEBUG
    #if !targetEnvironment(simulator)
    if let bundled = Bundle.main.url(forResource: "main", withExtension: "jsbundle") {
      NSLog("Using bundled JS for debug device build (Metro disabled)")
      return bundled
    }
    NSLog("Missing main.jsbundle in debug device build; Metro fallback is disabled")
    return nil
    #else
    if let bundled = Bundle.main.url(forResource: "main", withExtension: "jsbundle") {
      if ProcessInfo.processInfo.environment["FORCE_METRO"] == "1" {
        // fall through to Metro URL provider below
      } else {
        NSLog("Using bundled JS for debug simulator build")
        return bundled
      }
    }

    let provider = RCTBundleURLProvider.sharedSettings()
    if provider.jsLocation == nil || provider.jsLocation?.isEmpty == true {
      if let metroHost = ProcessInfo.processInfo.environment["METRO_HOST"], !metroHost.isEmpty {
        provider.jsLocation = metroHost
      }
    }
    return provider.jsBundleURL(forBundleRoot: "index")
    #endif
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }

  // Keyboard event monitoring for input debugging
  @objc func keyboardWillShow(_ notification: Notification) {
    NSLog("[Keyboard] willShow: \(notification.userInfo ?? [:])")
  }

  @objc func keyboardDidShow(_ notification: Notification) {
    NSLog("[Keyboard] didShow: \(notification.userInfo ?? [:])")
  }

  @objc func keyboardWillHide(_ notification: Notification) {
    NSLog("[Keyboard] willHide: \(notification.userInfo ?? [:])")
  }

  @objc func keyboardDidHide(_ notification: Notification) {
    NSLog("[Keyboard] didHide: \(notification.userInfo ?? [:])")
  }
}
