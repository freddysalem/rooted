import SwiftUI

/// The on-screen twin of a real plant. It is drawn, not photographed - no camera needed -
/// and it grows as the real one does: `progress` drives every dimension here.
///
/// Each sprite sways on its own clock, seeded from the plant, so a bed of twelve never
/// looks like twelve copies of one animation.
struct PlantSprite: View {
    let family: PlantFamily
    let progress: Double
    let seed: Int
    var height: CGFloat = 90

    @State private var animating = false

    var body: some View {
        ZStack(alignment: .bottom) {
            plant
                .rotationEffect(.degrees(animating ? swayAmount : -swayAmount), anchor: .bottom)
                .animation(
                    .easeInOut(duration: swayDuration).repeatForever(autoreverses: true),
                    value: animating
                )
        }
        .frame(width: height, height: height, alignment: .bottom)
        .onAppear { animating = true }
    }

    // MARK: - Proportions

    /// Never quite zero: a just-sown seed still shows a visible shoot. The floor is high
    /// enough that a day-old planting reads at bed size, not just in the big detail view.
    private var scale: CGFloat {
        0.30 + 0.70 * CGFloat(min(max(progress, 0), 1))
    }

    private var stemHeight: CGFloat { height * 0.64 * scale }
    private var stemWidth: CGFloat { max(2.5, height * 0.05 * (0.55 + 0.45 * scale)) }
    private var leafSize: CGFloat { height * 0.40 * scale }
    private var leafCount: Int { max(2, Int((2 + scale * 4).rounded())) }
    private var headSize: CGFloat { height * 0.38 * scale }

    private var swayAmount: Double { 1.5 + Double(seed % 4) * 0.45 }
    private var swayDuration: Double { 2.3 + Double(seed % 6) * 0.33 }

    // MARK: - Shapes

    @ViewBuilder
    private var plant: some View {
        switch family {
        case .leafy:    leafyPlant
        case .root:     rootPlant
        case .fruiting: fruitingPlant
        case .herb:     herbPlant
        case .flower:   flowerPlant
        }
    }

    private var stem: some View {
        Capsule()
            .fill(
                LinearGradient(
                    colors: [Theme.leafDeep, Theme.leaf],
                    startPoint: .bottom,
                    endPoint: .top
                )
            )
            .frame(width: stemWidth, height: stemHeight)
    }

    /// One leaf, alternating sides as it climbs the stem.
    private func leaf(index: Int, total: Int, size: CGFloat) -> some View {
        let t = CGFloat(index + 1) / CGFloat(total + 1)
        let side: CGFloat = index % 2 == 0 ? 1 : -1
        let width = size * (1.05 - 0.25 * t)
        let y = -stemHeight * (0.28 + 0.64 * t)
        return Ellipse()
            .fill(index % 2 == 0 ? Theme.leaf : Theme.leafLight)
            .frame(width: width, height: width * 0.46)
            .rotationEffect(.degrees(side > 0 ? -20 : 20))
            .offset(x: side * width * 0.46, y: y)
    }

    private var leafyPlant: some View {
        ZStack(alignment: .bottom) {
            stem
            ForEach(Array(0..<leafCount), id: \.self) { index in
                leaf(index: index, total: leafCount, size: leafSize * 1.15)
            }
        }
    }

    private var fruitingPlant: some View {
        ZStack(alignment: .bottom) {
            stem
            ForEach(Array(0..<leafCount), id: \.self) { index in
                leaf(index: index, total: leafCount, size: leafSize * 0.9)
            }
            if progress > 0.55 {
                fruitCluster
                    .transition(.scale.combined(with: .opacity))
            }
        }
    }

    private var fruitCluster: some View {
        let ripeness = min((progress - 0.55) / 0.45, 1)
        let berry = headSize * 0.34 * (0.5 + 0.5 * CGFloat(ripeness))
        return ZStack {
            ForEach(Array(0..<3), id: \.self) { index in
                Circle()
                    .fill(fruitColour(ripeness: ripeness))
                    .frame(width: berry, height: berry)
                    .offset(
                        x: CGFloat(index - 1) * berry * 0.85,
                        y: CGFloat(index % 2) * berry * 0.5
                    )
            }
        }
        .offset(y: -stemHeight * 0.78)
    }

    /// Green through to ripe as the plant approaches harvest.
    private func fruitColour(ripeness: Double) -> Color {
        Color(
            red: 0.35 + 0.50 * ripeness,
            green: 0.55 - 0.22 * ripeness,
            blue: 0.30 - 0.10 * ripeness
        )
    }

    private var flowerPlant: some View {
        ZStack(alignment: .bottom) {
            stem
            ForEach(Array(0..<min(leafCount, 3)), id: \.self) { index in
                leaf(index: index, total: 4, size: leafSize * 0.85)
            }
            if progress > 0.42 {
                flowerHead
                    .transition(.scale.combined(with: .opacity))
            }
        }
    }

    private var flowerHead: some View {
        ZStack {
            ForEach(Array(0..<7), id: \.self) { index in
                Ellipse()
                    .fill(Theme.sun)
                    .frame(width: headSize * 0.40, height: headSize * 0.70)
                    .offset(y: -headSize * 0.30)
                    .rotationEffect(.degrees(Double(index) * 360.0 / 7.0))
            }
            Circle()
                .fill(Theme.soilDeep)
                .frame(width: headSize * 0.44, height: headSize * 0.44)
        }
        .frame(width: headSize, height: headSize)
        .offset(y: -stemHeight + headSize * 0.30)
    }

    /// Root veg: a fan of blades above ground, with the crown of the root just showing.
    private var rootPlant: some View {
        ZStack(alignment: .bottom) {
            Circle()
                .fill(rootColour)
                .frame(width: headSize * 1.15, height: headSize * 1.15)
                .offset(y: headSize * 0.52)
                .clipped()

            ForEach(Array(0..<5), id: \.self) { index in
                Capsule()
                    .fill(index % 2 == 0 ? Theme.leaf : Theme.leafLight)
                    .frame(width: stemWidth * 0.85, height: stemHeight * (0.7 + 0.3 * CGFloat(index % 3) / 2))
                    .rotationEffect(.degrees(Double(index - 2) * 17), anchor: .bottom)
            }
        }
    }

    private var rootColour: Color {
        Theme.soil.opacity(0.85)
    }

    /// Herbs are bushy rather than tall - several short stems from one crown.
    private var herbPlant: some View {
        ZStack(alignment: .bottom) {
            ForEach(Array(0..<4), id: \.self) { index in
                ZStack(alignment: .bottom) {
                    Capsule()
                        .fill(Theme.leafDeep)
                        .frame(width: stemWidth * 0.7, height: stemHeight * 0.8)
                    ForEach(Array(0..<3), id: \.self) { leafIndex in
                        Circle()
                            .fill(leafIndex % 2 == 0 ? Theme.leaf : Theme.leafLight)
                            .frame(width: leafSize * 0.34, height: leafSize * 0.34)
                            .offset(
                                x: leafIndex % 2 == 0 ? leafSize * 0.16 : -leafSize * 0.16,
                                y: -stemHeight * (0.35 + 0.22 * CGFloat(leafIndex))
                            )
                    }
                }
                .rotationEffect(.degrees(Double(index - 2) * 13 + 6), anchor: .bottom)
            }
        }
    }
}

#Preview {
    HStack(alignment: .bottom, spacing: 12) {
        ForEach(Array(PlantFamily.allCases.enumerated()), id: \.offset) { index, family in
            PlantSprite(family: family, progress: 0.85, seed: index, height: 90)
        }
    }
    .padding()
    .background(Theme.background)
}
