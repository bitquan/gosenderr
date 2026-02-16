import Foundation
import UIKit
import UserNotifications
import FirebaseCore
import FirebaseMessaging
import React

@objc(SenderrNotificationsModule)
class SenderrNotificationsModule: NSObject {
  private let pushTokenDefaultsKey = "SenderrPushDeviceToken"
  private let fcmTokenDefaultsKey = "SenderrFCMToken"

  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc
  func requestPermission(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) {
      granted,
      error in
      if let error {
        reject("permission_error", error.localizedDescription, error)
        return
      }

      if granted {
        DispatchQueue.main.async {
          UIApplication.shared.registerForRemoteNotifications()
        }
      }

      resolve(granted)
    }
  }

  @objc
  func registerDeviceToken(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    let token = UserDefaults.standard.string(forKey: pushTokenDefaultsKey)
    resolve(token)
  }

  @objc
  func registerMessagingToken(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if FirebaseApp.app() == nil,
      hasUsableGoogleServicePlist()
    {
      FirebaseApp.configure()
    }

    guard FirebaseApp.app() != nil else {
      resolve(nil)
      return
    }

    if let cached = UserDefaults.standard.string(forKey: fcmTokenDefaultsKey), !cached.isEmpty {
      resolve(cached)
      return
    }

    // FCM token generation on iOS requires APNs token to be available first.
    let hasAPNSToken = Messaging.messaging().apnsToken != nil
      || !(UserDefaults.standard.string(forKey: pushTokenDefaultsKey) ?? "").isEmpty
    if !hasAPNSToken {
      resolve(nil)
      return
    }

    Messaging.messaging().token { token, error in
      if let error {
        reject("messaging_token_error", error.localizedDescription, error)
        return
      }

      guard let token, !token.isEmpty else {
        resolve(nil)
        return
      }

      UserDefaults.standard.set(token, forKey: self.fcmTokenDefaultsKey)
      resolve(token)
    }
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
}
