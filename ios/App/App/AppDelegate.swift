import UIKit
import Capacitor
import UserNotifications
import FirebaseCore
import AppTrackingTransparency

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Firebase init wrapped in safety guard to prevent crash on launch
        do {
            if FirebaseApp.app() == nil {
                FirebaseApp.configure()
            }
        } catch {
            NSLog("[BolaoCopa] Firebase configure error: \(error.localizedDescription)")
        }
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Request ATT authorization when app becomes active (required before AdMob tracking)
        requestTrackingAuthorization()
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // Push notification token registration
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    // MARK: UISceneSession Lifecycle (iPadOS 26 compatibility)
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: nil, sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }

    // MARK: - App Tracking Transparency (ATT)
    private var attRequested = false

    private func requestTrackingAuthorization() {
        guard !attRequested else { return }
        attRequested = true

        // Delay slightly to ensure the app UI is fully loaded
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            ATTrackingManager.requestTrackingAuthorization { status in
                NSLog("[BolaoCopa] ATT status: \(status.rawValue)")
            }
        }
    }
}

// MARK: - UISceneDelegate for iPadOS 26 compatibility
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        self.window = UIWindow(windowScene: windowScene)

        let storyboard = UIStoryboard(name: "Main", bundle: nil)
        if let vc = storyboard.instantiateInitialViewController() {
            self.window?.rootViewController = vc
            self.window?.makeKeyAndVisible()
        }
    }
}

// Delegate para notificações em foreground
extension AppDelegate: UNUserNotificationCenterDelegate {
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .badge])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        // Encaminhar para o Capacitor para que o listener JS receba o evento
        NotificationCenter.default.post(name: NSNotification.Name("pushNotificationActionPerformed"), object: response)
        completionHandler()
    }
}
