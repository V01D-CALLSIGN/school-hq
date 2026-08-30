import UIKit
import Capacitor

struct NextStaticExportRouter: Router {
    var basePath = ""

    func route(for path: String) -> String {
        let normalizedPath = URL(fileURLWithPath: path).standardized.path
        let relativePath = normalizedPath.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let rootIndex = URL(fileURLWithPath: basePath).appendingPathComponent("index.html").path

        guard !relativePath.isEmpty else { return rootIndex }

        let requestedFile = URL(fileURLWithPath: basePath).appendingPathComponent(relativePath).path
        if FileManager.default.fileExists(atPath: requestedFile) {
            return requestedFile
        }

        if URL(fileURLWithPath: relativePath).pathExtension.isEmpty {
            let routeIndex = URL(fileURLWithPath: requestedFile).appendingPathComponent("index.html").path
            if FileManager.default.fileExists(atPath: routeIndex) {
                return routeIndex
            }
            return rootIndex
        }

        // Next's App Router requests `/route.txt`, while a trailing-slash static
        // export stores that payload as `/route/index.txt`.
        if URL(fileURLWithPath: relativePath).pathExtension == "txt" {
            let routePath = String(relativePath.dropLast(4))
            let routePayload = URL(fileURLWithPath: basePath)
                .appendingPathComponent(routePath)
                .appendingPathComponent("index.txt")
                .path
            if FileManager.default.fileExists(atPath: routePayload) {
                return routePayload
            }
        }

        return requestedFile
    }
}

final class SchoolHQBridgeViewController: CAPBridgeViewController {
    override func router() -> Router {
        NextStaticExportRouter()
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        // Main.storyboard owns the app window and CAPBridgeViewController.
        // Creating a second window here can leave Capacitor's WebView detached
        // and keep the native launch screen visible indefinitely.
        guard scene is UIWindowScene else { return }
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
