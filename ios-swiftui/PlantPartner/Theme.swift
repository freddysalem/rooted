import SwiftUI

/// The Plant Partner palette: white with a green tint, warm yellows, grey-brown soil.
/// Soft, rounded, low-contrast - closer to a notebook than a dashboard.
enum Theme {
    static let background = Color(hex: 0xF5F9F3)
    static let surface    = Color(hex: 0xFFFFFF)
    static let surfaceAlt = Color(hex: 0xEFF4EC)

    static let leaf       = Color(hex: 0x4E8B57)
    static let leafDeep   = Color(hex: 0x3A6B41)
    static let leafLight  = Color(hex: 0x7FB37F)
    static let leafPale   = Color(hex: 0xCFE3CD)

    static let sun        = Color(hex: 0xE9C44C)
    static let sunPale    = Color(hex: 0xF7E9BC)

    static let soil       = Color(hex: 0x8A7561)
    static let soilDeep   = Color(hex: 0x6E5B4A)
    static let soilPale   = Color(hex: 0xC8B8A5)

    static let ink        = Color(hex: 0x2E3A30)
    static let inkSoft    = Color(hex: 0x77826F)
    static let warmGrey   = Color(hex: 0xEDE7DE)

    static let sky        = Color(hex: 0xDCEAF2)
    static let alert      = Color(hex: 0xC97B4A)

    static let cardRadius: CGFloat = 18
}

extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red:   Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >>  8) & 0xFF) / 255,
            blue:  Double( hex        & 0xFF) / 255,
            opacity: 1
        )
    }
}

// MARK: - Shared building blocks

/// A soft white card. Used for every panel in the app so the whole thing feels like one surface.
struct Card<Content: View>: View {
    var padding: CGFloat = 16
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.surface)
            .clipShape(RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                    .stroke(Theme.leafPale.opacity(0.55), lineWidth: 1)
            )
            .shadow(color: Theme.leafDeep.opacity(0.05), radius: 8, x: 0, y: 3)
    }
}

/// Small rounded label - "Full sun", "Needs water", "In season".
struct Pill: View {
    let text: String
    var systemImage: String?
    var tint: Color = Theme.leaf

    var body: some View {
        HStack(spacing: 4) {
            if let systemImage {
                Image(systemName: systemImage).font(.system(size: 10, weight: .semibold))
            }
            Text(text)
                .font(.system(size: 12, weight: .semibold, design: .rounded))
        }
        .foregroundStyle(tint)
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(tint.opacity(0.13))
        .clipShape(Capsule())
    }
}

struct SectionHeader: View {
    let title: String
    var subtitle: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.system(size: 19, weight: .bold, design: .rounded))
                .foregroundStyle(Theme.ink)
            if let subtitle {
                Text(subtitle)
                    .font(.system(size: 13, design: .rounded))
                    .foregroundStyle(Theme.inkSoft)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
