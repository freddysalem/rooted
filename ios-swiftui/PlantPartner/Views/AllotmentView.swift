import SwiftUI

/// The home screen: your plot, laid out as beds you can scroll through. Every plant on
/// it is the live state of a real one - press it and it pulses back at you.
struct AllotmentView: View {
    @EnvironmentObject private var garden: Garden

    @State private var selectedPlanting: Planting?
    @State private var plotToPlant: PlotSelection?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    WeatherHeader()

                    if let alert = garden.weather?.condition.alert {
                        AlertBanner(text: alert)
                    }

                    ThirstyStrip(onSelect: { selectedPlanting = $0 })

                    PlotGrid(
                        onOpen: { selectedPlanting = $0 },
                        onEmptyTap: { plotToPlant = PlotSelection(id: $0) }
                    )

                    if garden.plantings.isEmpty {
                        EmptyPlotPrompt {
                            plotToPlant = PlotSelection(id: garden.firstEmptyPlot ?? 0)
                        }
                    }
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 28)
            }
            .background(Theme.background)
            .navigationTitle("Allotment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        if let plot = garden.firstEmptyPlot {
                            Haptics.selection()
                            plotToPlant = PlotSelection(id: plot)
                        }
                    } label: {
                        Image(systemName: "plus.circle.fill")
                    }
                    .disabled(garden.firstEmptyPlot == nil)
                }
            }
        }
        .sheet(item: $selectedPlanting) { planting in
            PlantDetailView(plantingID: planting.id)
                .environmentObject(garden)
        }
        .sheet(item: $plotToPlant) { selection in
            AddPlantView(plot: selection.id)
                .environmentObject(garden)
        }
        .task {
            let provider = SeasonalMockWeather()
            garden.weather = await provider.snapshot()
        }
    }
}

/// Lets a bare plot number drive a `.sheet(item:)`.
struct PlotSelection: Identifiable {
    let id: Int
}

// MARK: - Header

private struct WeatherHeader: View {
    @EnvironmentObject private var garden: Garden

    private var greeting: String {
        switch Calendar.current.component(.hour, from: Date()) {
        case 0..<12:  return "Good morning"
        case 12..<18: return "Good afternoon"
        default:      return "Good evening"
        }
    }

    var body: some View {
        Card {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(greeting)
                        .font(.system(size: 22, weight: .bold, design: .rounded))
                        .foregroundStyle(Theme.ink)
                    Text(thirstyLine)
                        .font(.system(size: 14, design: .rounded))
                        .foregroundStyle(Theme.inkSoft)
                }
                Spacer()
                if let weather = garden.weather {
                    VStack(spacing: 2) {
                        Image(systemName: weather.condition.icon)
                            .font(.system(size: 24))
                            .foregroundStyle(Theme.sun)
                        Text("\(Int(weather.temperatureC.rounded()))°")
                            .font(.system(size: 18, weight: .semibold, design: .rounded))
                            .foregroundStyle(Theme.ink)
                        Text(weather.condition.label)
                            .font(.system(size: 10, design: .rounded))
                            .foregroundStyle(Theme.inkSoft)
                    }
                }
            }
        }
    }

    private var thirstyLine: String {
        let count = garden.thirsty.count
        if garden.plantings.isEmpty { return "Your plot is empty - let's plant something." }
        if count == 0 { return "Nothing needs watering today." }
        return count == 1 ? "1 plant is asking for water." : "\(count) plants are asking for water."
    }
}

private struct AlertBanner: View {
    let text: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Theme.alert)
            Text(text)
                .font(.system(size: 13, weight: .medium, design: .rounded))
                .foregroundStyle(Theme.ink)
            Spacer(minLength: 0)
        }
        .padding(12)
        .background(Theme.alert.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

/// A quick row of everything thirsty, so watering never needs a hunt through the beds.
private struct ThirstyStrip: View {
    @EnvironmentObject private var garden: Garden
    let onSelect: (Planting) -> Void

    var body: some View {
        let thirsty = garden.thirsty
        if !thirsty.isEmpty {
            Card(padding: 14) {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Needs water")
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(Theme.inkSoft)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(thirsty) { planting in
                                Button {
                                    garden.water(planting)
                                } label: {
                                    HStack(spacing: 6) {
                                        Image(systemName: "drop.fill")
                                            .font(.system(size: 11))
                                        Text(planting.nickname)
                                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                                    }
                                    .foregroundStyle(Theme.leafDeep)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(Theme.leafPale.opacity(0.6))
                                    .clipShape(Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
            }
        }
    }
}

// MARK: - The plot

private struct PlotGrid: View {
    @EnvironmentObject private var garden: Garden
    let onOpen: (Planting) -> Void
    let onEmptyTap: (Int) -> Void

    private let columns = Array(
        repeating: GridItem(.flexible(), spacing: 12),
        count: Plot.columns
    )

    var body: some View {
        Card(padding: 14) {
            VStack(alignment: .leading, spacing: 12) {
                SectionHeader(title: "Your plot", subtitle: "Press a plant to say hello")
                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(0..<Plot.count, id: \.self) { plot in
                        if let planting = garden.planting(inPlot: plot) {
                            PlantedBed(planting: planting) { onOpen(planting) }
                        } else {
                            EmptyBed { onEmptyTap(plot) }
                        }
                    }
                }
            }
        }
    }
}

/// One bed with something growing in it.
private struct PlantedBed: View {
    @EnvironmentObject private var garden: Garden
    let planting: Planting
    let onOpen: () -> Void

    @State private var pressed = false

    var body: some View {
        VStack(spacing: 6) {
            ZStack(alignment: .bottom) {
                soil
                PlantSprite(
                    family: planting.species.family,
                    progress: planting.progress,
                    seed: abs(planting.id.hashValue % 97),
                    height: 78
                )
                .offset(y: -10)

                if garden.needsWater(planting) {
                    Image(systemName: "drop.fill")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(5)
                        .background(Circle().fill(Theme.leaf))
                        .offset(x: 30, y: -66)
                }
            }
            .scaleEffect(pressed ? 1.10 : 1.0)
            .animation(.spring(response: 0.30, dampingFraction: 0.45), value: pressed)

            Text(planting.nickname)
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(Theme.ink)
                .lineLimit(1)
        }
        .contentShape(Rectangle())
        .onTapGesture {
            // The pulse and the haptic fire together - the plant answers your press.
            Haptics.pulse()
            pressed = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.22) {
                pressed = false
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.30) {
                onOpen()
            }
        }
    }

    private var soil: some View {
        RoundedRectangle(cornerRadius: 12, style: .continuous)
            .fill(
                LinearGradient(
                    colors: [Theme.soil, Theme.soilDeep],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .frame(height: 26)
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Theme.soilDeep.opacity(0.5), lineWidth: 1)
            )
    }
}

private struct EmptyBed: View {
    let onTap: () -> Void

    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Theme.soilPale.opacity(0.35))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .strokeBorder(
                                style: StrokeStyle(lineWidth: 1.5, dash: [5, 4])
                            )
                            .foregroundStyle(Theme.soilPale)
                    )
                Image(systemName: "plus")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Theme.soil.opacity(0.8))
            }
            .frame(height: 78)

            Text("Empty")
                .font(.system(size: 12, design: .rounded))
                .foregroundStyle(Theme.inkSoft.opacity(0.7))
        }
        .contentShape(Rectangle())
        .onTapGesture {
            Haptics.selection()
            onTap()
        }
    }
}

private struct EmptyPlotPrompt: View {
    let onPlant: () -> Void

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                Text("Nothing growing yet")
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .foregroundStyle(Theme.ink)
                Text("Start with a radish. It is up in four weeks and almost impossible to get wrong - which is the whole point of the first one.")
                    .font(.system(size: 14, design: .rounded))
                    .foregroundStyle(Theme.inkSoft)
                Button(action: onPlant) {
                    Text("Plant something")
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
}
