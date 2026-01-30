import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }

        // Prefer using the Main storyboard if present (existing project uses Main.storyboard)
        if let storyboard = UIStoryboard(name: "Main", bundle: nil) as UIStoryboard?, let root = storyboard.instantiateInitialViewController() {
            let window = UIWindow(windowScene: windowScene)
            window.rootViewController = root
            self.window = window
            window.makeKeyAndVisible()
            return
        }

        // Fallback: create a Capacitor bridge view controller programmatically
        let window = UIWindow(windowScene: windowScene)
        let bridgeVC = CAPBridgeViewController()
        window.rootViewController = bridgeVC
        self.window = window
        window.makeKeyAndVisible()
    }

}