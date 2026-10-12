import SwiftUI

/// Deliberately private and deliberately not a league table. The comparison that makes
/// people give up gardening is comparison with other gardeners.
struct BadgesView: View {
    @EnvironmentObject private var garden: Garden

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 12), count: 2)

    private var earnedCount: Int {
        BadgeCatalogue.all.filter { garden.hasEarned($0) }.count
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    Card {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("\(earnedCount) of \(BadgeCatalogue.all.count)")
                                .font(.system(size: 26, weight: .bold, design: .rounded))
                                .foregroundStyle(Theme.ink)
                            Text("Yours alone. Nobody else can see these, and there is no leaderboard to fall down.")
                                .font(.system(size: 14, design: .rounded))
                                .foregroundStyle(Theme.inkSoft)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }

                    LazyVGrid(columns: columns, spacing: 12) {
                        ForEach(BadgeCatalogue.all) { badge in
                            BadgeTile(badge: badge, earned: garden.hasEarned(badge))
                        }
                    }
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 30)
            }
            .background(Theme.background)
            .navigationTitle("Badges")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

private struct BadgeTile: View {
    let badge: Badge
    let earned: Bool

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(earned ? Theme.sunPale : Theme.surfaceAlt)
                    .frame(width: 58, height: 58)
                Image(systemName: badge.symbol)
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(earned ? Theme.sun : Theme.inkSoft.opacity(0.35))
            }

            Text(badge.name)
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundStyle(earned ? Theme.ink : Theme.inkSoft)
                .multilineTextAlignment(.center)

            Text(badge.blurb)
                .font(.system(size: 11, design: .rounded))
                .foregroundStyle(Theme.inkSoft)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .padding(.horizontal, 10)
        .background(Theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                .stroke(earned ? Theme.sun.opacity(0.35) : Theme.leafPale.opacity(0.5), lineWidth: 1)
        )
        .opacity(earned ? 1 : 0.72)
    }
}
