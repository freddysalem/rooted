import SwiftUI
import Combine
import CoreLocation

/// Stand in the spot, point the phone at it, and the app works out how much sun that
/// patch of ground actually gets - then names the plants that will be happy there.
///
/// No camera is needed for the maths: the compass gives the bearing, the date and your
/// coordinates give the sun's track, and the only judgement call left is how enclosed
/// the spot is, which you set yourself.
struct SunSpotView: View {
    @EnvironmentObject private var garden: Garden
    @StateObject private var location = LocationProvider()

    @State private var obstruction: Double = 12
    @State private var frozenBearing: Double?
    @State private var now = Date()

    private let ticker = Timer.publish(every: 30, on: .main, in: .common).autoconnect()

    private var bearing: Double { frozenBearing ?? location.heading }

    private var sunHours: Double {
        SunPath.directSunHours(
            date: now,
            latitude: location.latitude,
            longitude: location.longitude,
            bearing: bearing,
            obstructionDegrees: obstruction
        )
    }

    private var recommendedLight: LightNeed {
        SunPath.lightNeed(forHours: sunHours)
    }

    private var suggestions: [Species] {
        let month = Calendar.current.component(.month, from: now)
        let suited = SpeciesCatalogue.all.filter {
            $0.light.minimumDirectHours <= sunHours + 0.5
        }
        let seasonal = suited.filter { $0.sowMonths.contains(month) }
        return Array((seasonal.isEmpty ? suited : seasonal).prefix(6))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    dialCard
                    resultCard
                    obstructionCard
                    suggestionsCard
                    locationNote
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 30)
            }
            .background(Theme.background)
            .navigationTitle("Sun spot")
            .navigationBarTitleDisplayMode(.inline)
        }
        .onAppear { location.start() }
        .onDisappear { location.stop() }
        .onReceive(ticker) { now = $0 }
    }

    // MARK: - Dial

    private var dialCard: some View {
        Card {
            VStack(spacing: 14) {
                SunDial(
                    bearing: bearing,
                    arc: SunPath.arc(for: now,
                                     latitude: location.latitude,
                                     longitude: location.longitude,
                                     stepMinutes: 20),
                    current: SunPath.position(at: now,
                                              latitude: location.latitude,
                                              longitude: location.longitude),
                    obstruction: obstruction
                )
                .frame(height: 250)

                HStack(spacing: 10) {
                    Button {
                        Haptics.tap(.light)
                        if frozenBearing == nil {
                            frozenBearing = location.heading
                        } else {
                            frozenBearing = nil
                        }
                    } label: {
                        Text(frozenBearing == nil ? "Lock this direction" : "Unlock compass")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 11)
                            .background(frozenBearing == nil ? Theme.surfaceAlt : Theme.leaf)
                            .foregroundStyle(frozenBearing == nil ? Theme.leafDeep : .white)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }

                if !location.headingAvailable {
                    Text("No compass on this device - drag the dial value with the slider below instead.")
                        .font(.system(size: 12, design: .rounded))
                        .foregroundStyle(Theme.inkSoft)
                        .multilineTextAlignment(.center)
                }
            }
        }
    }

    private var resultCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 8) {
                Text("Facing \(SunPath.compassLabel(bearing)) · \(Int(bearing.rounded()))°")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(Theme.inkSoft)

                Text("\(String(format: "%.1f", sunHours)) hours of direct sun")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(Theme.leafDeep)

                Pill(text: "Suits " + recommendedLight.label.lowercased() + " plants",
                     systemImage: recommendedLight.icon,
                     tint: Theme.sun)

                Text(explanation)
                    .font(.system(size: 13, design: .rounded))
                    .foregroundStyle(Theme.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private var explanation: String {
        let month = DateFormatter().monthSymbols[Calendar.current.component(.month, from: now) - 1]
        switch recommendedLight {
        case .fullSun:
            return "A bright spot in \(month). Tomatoes, beans and anything that has to ripen will do well here."
        case .partialShade:
            return "Middling light in \(month). Leaves and roots are happy; fruit will be slow and sparse."
        case .shade:
            return "Little direct sun in \(month). Stick to mint, leafy greens and anything you eat before it flowers."
        }
    }

    private var obstructionCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                SectionHeader(
                    title: "How enclosed is it?",
                    subtitle: "How high the walls, fences and trees around the spot reach."
                )
                Slider(value: $obstruction, in: 0...45, step: 1)
                    .tint(Theme.leaf)
                HStack {
                    Text(obstructionLabel)
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(Theme.ink)
                    Spacer()
                    Text("\(Int(obstruction))° skyline")
                        .font(.system(size: 12, design: .rounded))
                        .foregroundStyle(Theme.inkSoft)
                }

                if !location.headingAvailable {
                    Divider().padding(.vertical, 4)
                    Text("Direction")
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(Theme.ink)
                    Slider(
                        value: Binding(
                            get: { frozenBearing ?? 180 },
                            set: { frozenBearing = $0 }
                        ),
                        in: 0...359,
                        step: 1
                    )
                    .tint(Theme.sun)
                }
            }
        }
    }

    private var obstructionLabel: String {
        switch obstruction {
        case ..<6:   return "Open field"
        case ..<16:  return "Ordinary garden"
        case ..<28:  return "Hemmed in by fences"
        default:     return "Overshadowed by buildings"
        }
    }

    private var suggestionsCard: some View {
        Card(padding: 14) {
            VStack(alignment: .leading, spacing: 12) {
                SectionHeader(title: "Plant this here",
                              subtitle: "Happy with \(String(format: "%.1f", sunHours)) hours of sun.")
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(suggestions) { species in
                            VStack(spacing: 6) {
                                ZStack(alignment: .bottom) {
                                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                                        .fill(Theme.surfaceAlt)
                                        .frame(width: 96, height: 80)
                                    PlantSprite(family: species.family, progress: 0.85,
                                                seed: species.id.count, height: 70)
                                }
                                Text(species.name)
                                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                                    .foregroundStyle(Theme.ink)
                            }
                            .frame(width: 96)
                        }
                    }
                }

                Button {
                    garden.markSunSurveyed()
                    Haptics.success()
                } label: {
                    Text("Save this survey")
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Theme.leaf)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var locationNote: some View {
        HStack(spacing: 8) {
            Image(systemName: location.isUsingFallback ? "location.slash" : "location.fill")
                .font(.system(size: 12))
                .foregroundStyle(Theme.inkSoft)
            Text(location.isUsingFallback
                 ? "Using \(LocationProvider.fallbackName) as a stand-in until location is allowed."
                 : "Using your location, accurate to the nearest few hundred metres.")
                .font(.system(size: 12, design: .rounded))
                .foregroundStyle(Theme.inkSoft)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 4)
    }
}

/// The compass rose: where you are pointing, where the sun is, and its whole track today.
private struct SunDial: View {
    let bearing: Double
    let arc: [(Date, SunPosition)]
    let current: SunPosition
    let obstruction: Double

    var body: some View {
        GeometryReader { geometry in
            let size = min(geometry.size.width, geometry.size.height)
            let radius = size / 2 - 26
            let centre = CGPoint(x: geometry.size.width / 2, y: geometry.size.height / 2)

            ZStack {
                Circle()
                    .stroke(Theme.leafPale, lineWidth: 1.5)
                    .frame(width: radius * 2, height: radius * 2)
                    .position(centre)

                Circle()
                    .fill(Theme.surfaceAlt)
                    .frame(width: radius * 0.9, height: radius * 0.9)
                    .position(centre)

                // The sun's track. Each dot is a moment; the ones that clear the skyline
                // and fall within the facing arc are the ones that count.
                ForEach(Array(arc.enumerated()), id: \.offset) { _, sample in
                    let position = sample.1
                    if position.elevation > -2 {
                        let lit = position.elevation > obstruction
                            && SunPath.angularDistance(position.azimuth, bearing) <= 90
                        let r = radius * (1 - CGFloat(max(position.elevation, 0)) / 90 * 0.55)
                        Circle()
                            .fill(lit ? Theme.sun : Theme.sunPale.opacity(0.55))
                            .frame(width: lit ? 7 : 4, height: lit ? 7 : 4)
                            .position(point(centre: centre, radius: r, bearing: position.azimuth))
                    }
                }

                // Which way you are facing.
                Path { path in
                    path.move(to: centre)
                    path.addLine(to: point(centre: centre, radius: radius, bearing: bearing))
                }
                .stroke(Theme.leaf, style: StrokeStyle(lineWidth: 3, lineCap: .round))

                Circle()
                    .fill(Theme.leaf)
                    .frame(width: 10, height: 10)
                    .position(centre)

                // The sun right now.
                if current.isUp {
                    Image(systemName: "sun.max.fill")
                        .font(.system(size: 16))
                        .foregroundStyle(Theme.sun)
                        .position(point(
                            centre: centre,
                            radius: radius * (1 - CGFloat(max(current.elevation, 0)) / 90 * 0.55),
                            bearing: current.azimuth
                        ))
                }

                ForEach(Array(["N", "E", "S", "W"].enumerated()), id: \.offset) { index, label in
                    Text(label)
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundStyle(Theme.inkSoft)
                        .position(point(centre: centre, radius: radius + 15, bearing: Double(index) * 90))
                }
            }
        }
    }

    /// Compass bearings run clockwise from north, which is up.
    private func point(centre: CGPoint, radius: CGFloat, bearing: Double) -> CGPoint {
        let radians = bearing * .pi / 180
        return CGPoint(
            x: centre.x + radius * CGFloat(sin(radians)),
            y: centre.y - radius * CGFloat(cos(radians))
        )
    }
}
