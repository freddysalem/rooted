import SwiftUI

@main
struct PlantPartnerApp: App {
    @StateObject private var garden = Garden()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(garden)
                .tint(Theme.leaf)
                .preferredColorScheme(.light)
        }
    }
}
