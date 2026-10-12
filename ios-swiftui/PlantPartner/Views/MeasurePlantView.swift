import SwiftUI
import CoreMotion

/// Photo-based measurement, reduced to the part that actually does the work.
///
/// The trick is a reference object of known size stood in the soil: whatever the camera
/// distance, the *ratio* between the reference and the plant is fixed, so
/// `plant_cm = reference_cm × (plant_on_screen / reference_on_screen)`. Drag the two
/// markers to match what you see and the arithmetic falls out.
///
/// The device's motion sensor keeps the shot square - a tilted frame skews the ratio and
/// quietly ruins the measurement, so the level has to be honest about it.
struct MeasurePlantView: View {
    let planting: Planting

    @EnvironmentObject private var garden: Garden
    @Environment(\.dismiss) private var dismiss
    @StateObject private var level = LevelSensor()

    @State private var reference = ReferenceObject.seedPacket
    @State private var customCentimetres = "20"
    @State private var referenceSpan: CGFloat = 90
    @State private var plantSpan: CGFloat = 150

    private var referenceCentimetres: Double {
        reference == .custom ? (Double(customCentimetres) ?? 20) : reference.centimetres
    }

    private var measured: Double {
        guard referenceSpan > 8 else { return 0 }
        return referenceCentimetres * Double(plantSpan / referenceSpan)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    levelCard
                    referenceCard
                    canvasCard
                    resultCard
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 30)
            }
            .background(Theme.background)
            .navigationTitle("Measure \(planting.nickname)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        garden.recordHeight(measured, for: planting)
                        Haptics.success()
                        dismiss()
                    }
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .disabled(measured <= 0)
                }
            }
        }
        .onAppear { level.start() }
        .onDisappear { level.stop() }
    }

    // MARK: - Sections

    private var levelCard: some View {
        Card(padding: 14) {
            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .stroke(Theme.leafPale, lineWidth: 2)
                        .frame(width: 46, height: 46)
                    Circle()
                        .fill(level.isLevel ? Theme.leaf : Theme.sun)
                        .frame(width: 14, height: 14)
                        .offset(
                            x: CGFloat(max(min(level.roll * 60, 16), -16)),
                            y: CGFloat(max(min(level.pitch * 60, 16), -16))
                        )
                        .animation(.easeOut(duration: 0.15), value: level.roll)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(level.available
                         ? (level.isLevel ? "Level - take the shot" : "Straighten up a little")
                         : "No motion sensor here")
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                        .foregroundStyle(Theme.ink)
                    Text("A tilted frame stretches one side and the ratio stops being true.")
                        .font(.system(size: 12, design: .rounded))
                        .foregroundStyle(Theme.inkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
            }
        }
    }

    private var referenceCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                SectionHeader(title: "Reference object",
                              subtitle: "Stand something you know the size of in the soil.")
                Picker("Reference", selection: $reference) {
                    ForEach(ReferenceObject.allCases, id: \.self) { object in
                        Text(object.label).tag(object)
                    }
                }
                .pickerStyle(.segmented)

                if reference == .custom {
                    HStack {
                        TextField("Height in cm", text: $customCentimetres)
                            .keyboardType(.decimalPad)
                            .font(.system(size: 15, design: .rounded))
                            .padding(10)
                            .background(Theme.surfaceAlt)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        Text("cm")
                            .font(.system(size: 14, design: .rounded))
                            .foregroundStyle(Theme.inkSoft)
                    }
                }
            }
        }
    }

    private var canvasCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                SectionHeader(title: "Match the two bars",
                              subtitle: "Drag each one to the height it appears in your photo.")

                HStack(alignment: .bottom, spacing: 28) {
                    DragBar(
                        span: $referenceSpan,
                        tint: Theme.sun,
                        caption: "Reference",
                        detail: "\(Int(referenceCentimetres.rounded())) cm"
                    )
                    DragBar(
                        span: $plantSpan,
                        tint: Theme.leaf,
                        caption: "Plant",
                        detail: measured > 0 ? "\(Int(measured.rounded())) cm" : "-"
                    )
                    Spacer(minLength: 0)
                }
                .frame(height: 230)
            }
        }
    }

    private var resultCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 6) {
                Text("Measured height")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(Theme.inkSoft)
                Text(measured > 0 ? "\(String(format: "%.1f", measured)) cm" : "-")
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .foregroundStyle(Theme.leafDeep)
                if let previous = planting.latestHeight, measured > 0 {
                    let change = measured - previous
                    Text(change >= 0
                         ? "Up \(String(format: "%.1f", change)) cm on last time"
                         : "Down \(String(format: "%.1f", -change)) cm on last time")
                        .font(.system(size: 13, design: .rounded))
                        .foregroundStyle(change >= 0 ? Theme.leaf : Theme.alert)
                }
            }
        }
    }
}

/// A bar you drag from the bottom up. Its height in points is the only thing the
/// measurement needs.
private struct DragBar: View {
    @Binding var span: CGFloat
    let tint: Color
    let caption: String
    let detail: String

    var body: some View {
        VStack(spacing: 6) {
            Spacer(minLength: 0)
            ZStack(alignment: .bottom) {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(tint.opacity(0.18))
                    .frame(width: 34, height: span)
                Circle()
                    .fill(tint)
                    .frame(width: 20, height: 20)
                    .offset(y: -span + 10)
                    .shadow(color: tint.opacity(0.4), radius: 3, y: 1)
            }
            .frame(width: 34, height: 200, alignment: .bottom)
            .contentShape(Rectangle())
            .gesture(
                DragGesture()
                    .onChanged { value in
                        let proposed = span - value.translation.height * 0.32
                        span = max(20, min(200, proposed))
                    }
                    .onEnded { _ in Haptics.selection() }
            )

            Text(caption)
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(Theme.ink)
            Text(detail)
                .font(.system(size: 11, design: .rounded))
                .foregroundStyle(Theme.inkSoft)
        }
    }
}

enum ReferenceObject: String, CaseIterable, Hashable {
    case creditCard, seedPacket, trowel, custom

    var label: String {
        switch self {
        case .creditCard: return "Card"
        case .seedPacket: return "Packet"
        case .trowel:     return "Trowel"
        case .custom:     return "Other"
        }
    }

    /// Long edge, in centimetres.
    var centimetres: Double {
        switch self {
        case .creditCard: return 8.6
        case .seedPacket: return 16.0
        case .trowel:     return 30.0
        case .custom:     return 20.0
        }
    }
}

/// Thin wrapper over device motion, used as a spirit level.
final class LevelSensor: ObservableObject {
    @Published var roll: Double = 0
    @Published var pitch: Double = 0
    @Published var available = false

    private let motion = CMMotionManager()

    var isLevel: Bool { abs(roll) < 0.06 && abs(pitch) < 0.06 }

    func start() {
        guard motion.isDeviceMotionAvailable else {
            available = false
            return
        }
        available = true
        motion.deviceMotionUpdateInterval = 1.0 / 30.0
        motion.startDeviceMotionUpdates(to: .main) { [weak self] data, _ in
            guard let data else { return }
            self?.roll = data.attitude.roll
            self?.pitch = data.attitude.pitch + .pi / 2
        }
    }

    func stop() {
        motion.stopDeviceMotionUpdates()
    }
}
