import SwiftUI

struct RootView: View {
    @EnvironmentObject private var garden: Garden

    var body: some View {
        TabView {
            AllotmentView()
                .tabItem { Label("Allotment", systemImage: "leaf.fill") }

            DiscoverView()
                .tabItem { Label("Discover", systemImage: "sparkles") }

            SunSpotView()
                .tabItem { Label("Sun spot", systemImage: "sun.max.fill") }

            BadgesView()
                .tabItem { Label("Badges", systemImage: "rosette") }
        }
        .overlay(alignment: .top) {
            if let badge = garden.justEarned {
                BadgeToast(badge: badge)
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2.8) {
                            withAnimation(.easeInOut) { garden.justEarned = nil }
                        }
                    }
            }
        }
        .animation(.spring(response: 0.4, dampingFraction: 0.8), value: garden.justEarned)
        .onAppear { garden.refreshOnAppear() }
    }
}

/// Badges are private, so this is the whole celebration - a quiet note to yourself.
struct BadgeToast: View {
    let badge: Badge

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: badge.symbol)
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(Theme.sun)
                .frame(width: 40, height: 40)
                .background(Theme.sunPale)
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 1) {
                Text("Badge earned")
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundStyle(Theme.inkSoft)
                Text(badge.name)
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundStyle(Theme.ink)
            }
            Spacer()
        }
        .padding(12)
        .background(Theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .shadow(color: Theme.leafDeep.opacity(0.16), radius: 14, y: 5)
    }
}
