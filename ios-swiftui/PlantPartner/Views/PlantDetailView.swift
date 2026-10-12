import SwiftUI

/// Everything about one plant. Takes an id rather than a copy so it stays live while
/// you water and measure from inside the sheet.
struct PlantDetailView: View {
    let plantingID: UUID

    @EnvironmentObject private var garden: Garden
    @Environment(\.dismiss) private var dismiss

    @State private var showingMeasure = false
    @State private var notesDraft = ""
    @State private var confirmingRemoval = false

    private var planting: Planting? {
        garden.plantings.first { $0.id == plantingID }
    }

    var body: some View {
        NavigationStack {
            Group {
                if let planting {
                    content(for: planting)
                } else {
                    Text("This plant is no longer in your plot.")
                        .font(.system(size: 15, design: .rounded))
                        .foregroundStyle(Theme.inkSoft)
                }
            }
            .background(Theme.background)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                }
            }
        }
        .onAppear { notesDraft = planting?.notes ?? "" }
    }

    private func content(for planting: Planting) -> some View {
        ScrollView {
            VStack(spacing: 14) {
                hero(for: planting)
                wateringCard(for: planting)
                growthCard(for: planting)
                careCard(for: planting)
                notesCard(for: planting)
                removeButton(for: planting)
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 30)
        }
        .sheet(isPresented: $showingMeasure) {
            MeasurePlantView(planting: planting)
                .environmentObject(garden)
        }
    }

    // MARK: - Sections

    private func hero(for planting: Planting) -> some View {
        Card {
            VStack(spacing: 12) {
                ZStack(alignment: .bottom) {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [Theme.sky.opacity(0.5), Theme.surfaceAlt],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .frame(height: 190)

                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(LinearGradient(colors: [Theme.soil, Theme.soilDeep],
                                             startPoint: .top, endPoint: .bottom))
                        .frame(height: 30)

                    PlantSprite(
                        family: planting.species.family,
                        progress: planting.progress,
                        seed: abs(planting.id.hashValue % 97),
                        height: 150
                    )
                    .offset(y: -14)
                }

                VStack(spacing: 3) {
                    Text(planting.nickname)
                        .font(.system(size: 24, weight: .bold, design: .rounded))
                        .foregroundStyle(Theme.ink)
                    Text(planting.species.name)
                        .font(.system(size: 14, design: .rounded))
                        .foregroundStyle(Theme.inkSoft)
                }

                HStack(spacing: 6) {
                    Pill(text: planting.stage.label, systemImage: "leaf.fill")
                    Pill(text: planting.species.light.label,
                         systemImage: planting.species.light.icon,
                         tint: Theme.sun)
                }

                progressBar(for: planting)
            }
        }
    }

    private func progressBar(for planting: Planting) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Theme.surfaceAlt)
                    Capsule()
                        .fill(LinearGradient(colors: [Theme.leafLight, Theme.leaf],
                                             startPoint: .leading, endPoint: .trailing))
                        .frame(width: max(8, geometry.size.width * planting.progress))
                }
            }
            .frame(height: 10)

            HStack {
                Text("Day \(planting.daysSincePlanting)")
                Spacer()
                Text(planting.daysUntilHarvest == 0
                     ? "Ready now"
                     : "\(planting.daysUntilHarvest) days to harvest")
            }
            .font(.system(size: 12, design: .rounded))
            .foregroundStyle(Theme.inkSoft)
        }
    }

    private func wateringCard(for planting: Planting) -> some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                SectionHeader(title: "Water", subtitle: garden.wateringAdvice(for: planting))

                HStack(spacing: 10) {
                    Button {
                        garden.water(planting)
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "drop.fill")
                            Text("Water now")
                        }
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(garden.needsWater(planting) ? Theme.leaf : Theme.surfaceAlt)
                        .foregroundStyle(garden.needsWater(planting) ? .white : Theme.inkSoft)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }

                HStack {
                    Text(lastWateredText(for: planting))
                    Spacer()
                    Text("Every \(garden.wateringInterval(for: planting)) days")
                }
                .font(.system(size: 12, design: .rounded))
                .foregroundStyle(Theme.inkSoft)
            }
        }
    }

    private func lastWateredText(for planting: Planting) -> String {
        guard let last = planting.lastWatered else { return "Not watered yet" }
        let days = Calendar.current.dateComponents([.day], from: last, to: Date()).day ?? 0
        if days == 0 { return "Watered today" }
        return days == 1 ? "Watered yesterday" : "Watered \(days) days ago"
    }

    private func growthCard(for planting: Planting) -> some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                SectionHeader(
                    title: "Growth",
                    subtitle: "Photograph it next to something you know the size of - a trowel, a seed packet - and the app works out the rest."
                )

                if planting.heights.isEmpty {
                    Text("No measurements yet.")
                        .font(.system(size: 13, design: .rounded))
                        .foregroundStyle(Theme.inkSoft)
                } else {
                    HeightChart(entries: planting.heights.sorted { $0.date < $1.date })
                        .frame(height: 90)

                    HStack {
                        if let latest = planting.latestHeight {
                            Text("Now \(Int(latest.rounded())) cm")
                                .font(.system(size: 13, weight: .semibold, design: .rounded))
                                .foregroundStyle(Theme.ink)
                        }
                        Spacer()
                        if let gain = planting.heightGain, gain > 0 {
                            Text("+\(Int(gain.rounded())) cm since first measured")
                                .font(.system(size: 12, design: .rounded))
                                .foregroundStyle(Theme.leaf)
                        }
                    }
                }

                Button {
                    Haptics.selection()
                    showingMeasure = true
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "ruler.fill")
                        Text("Record a height")
                    }
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Theme.surfaceAlt)
                    .foregroundStyle(Theme.leafDeep)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func careCard(for planting: Planting) -> some View {
        Card {
            VStack(alignment: .leading, spacing: 8) {
                SectionHeader(title: "Care")
                Text(planting.species.tip)
                    .font(.system(size: 14, design: .rounded))
                    .foregroundStyle(Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)

                if let reminder = pruningReminder(for: planting) {
                    HStack(spacing: 8) {
                        Image(systemName: "scissors")
                            .foregroundStyle(Theme.leaf)
                        Text(reminder)
                            .font(.system(size: 13, design: .rounded))
                            .foregroundStyle(Theme.inkSoft)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(.top, 2)
                }
            }
        }
    }

    /// Seasonal jobs, driven off the plant's own stage rather than a generic calendar.
    private func pruningReminder(for planting: Planting) -> String? {
        switch planting.species.family {
        case .fruiting where planting.progress > 0.5:
            return "Pinch out the side shoots now so the plant puts its energy into fruit."
        case .herb where planting.progress > 0.4:
            return "Keep cutting it back. Herbs get woody the moment you stop picking."
        case .leafy where planting.progress > 0.6:
            return "Take the outer leaves first and leave the centre to keep going."
        case .root where planting.progress > 0.9:
            return "Lift one and check the size before you pull the whole row."
        case .flower where planting.progress > 0.8:
            return "Leave the seed head standing - the birds will thank you in January."
        default:
            return nil
        }
    }

    private func notesCard(for planting: Planting) -> some View {
        Card {
            VStack(alignment: .leading, spacing: 8) {
                SectionHeader(title: "Diary", subtitle: "What you tried, and whether it worked")
                TextEditor(text: $notesDraft)
                    .font(.system(size: 14, design: .rounded))
                    .frame(minHeight: 80)
                    .scrollContentBackground(.hidden)
                    .background(Theme.surfaceAlt)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .onChange(of: notesDraft) { _, newValue in
                        garden.updateNotes(newValue, for: planting)
                    }
            }
        }
    }

    private func removeButton(for planting: Planting) -> some View {
        Button(role: .destructive) {
            confirmingRemoval = true
        } label: {
            Text(planting.stage == .ready ? "Harvest and clear the bed" : "Remove from plot")
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
        }
        .buttonStyle(.plain)
        .foregroundStyle(Theme.alert)
        .confirmationDialog(
            "Clear this bed?",
            isPresented: $confirmingRemoval,
            titleVisibility: .visible
        ) {
            Button("Remove \(planting.nickname)", role: .destructive) {
                garden.remove(planting)
                dismiss()
            }
            Button("Keep it", role: .cancel) { }
        } message: {
            Text("Your badges stay earned either way.")
        }
    }
}

/// A plain line of measurements over time.
struct HeightChart: View {
    let entries: [HeightEntry]

    var body: some View {
        GeometryReader { geometry in
            let values = entries.map { $0.centimetres }
            let maxValue = max(values.max() ?? 1, 1)
            let minValue = min(values.min() ?? 0, 0)
            let range = max(maxValue - minValue, 1)

            ZStack {
                Path { path in
                    for (index, entry) in entries.enumerated() {
                        let x = entries.count == 1
                            ? geometry.size.width / 2
                            : geometry.size.width * CGFloat(index) / CGFloat(entries.count - 1)
                        let normalised = (entry.centimetres - minValue) / range
                        let y = geometry.size.height * (1 - CGFloat(normalised))
                        if index == 0 {
                            path.move(to: CGPoint(x: x, y: y))
                        } else {
                            path.addLine(to: CGPoint(x: x, y: y))
                        }
                    }
                }
                .stroke(Theme.leaf, style: StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round))

                ForEach(Array(entries.enumerated()), id: \.element.id) { index, entry in
                    let x = entries.count == 1
                        ? geometry.size.width / 2
                        : geometry.size.width * CGFloat(index) / CGFloat(entries.count - 1)
                    let normalised = (entry.centimetres - minValue) / range
                    let y = geometry.size.height * (1 - CGFloat(normalised))
                    Circle()
                        .fill(Theme.leaf)
                        .frame(width: 6, height: 6)
                        .position(x: x, y: y)
                }
            }
        }
    }
}
