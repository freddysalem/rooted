import SwiftUI

/// Choosing what to grow. Sorted so that whatever suits the month you are actually in
/// comes first - a seed catalogue in January order is no use to anyone in July.
struct AddPlantView: View {
    let plot: Int

    @EnvironmentObject private var garden: Garden
    @Environment(\.dismiss) private var dismiss

    @State private var selected: Species?
    @State private var nickname = ""
    @State private var search = ""

    private var month: Int { Calendar.current.component(.month, from: Date()) }

    private var inSeason: [Species] {
        filtered.filter { $0.sowMonths.contains(month) }
    }

    private var outOfSeason: [Species] {
        filtered.filter { !$0.sowMonths.contains(month) }
    }

    private var filtered: [Species] {
        let query = search.trimmingCharacters(in: .whitespaces).lowercased()
        guard !query.isEmpty else { return SpeciesCatalogue.all }
        return SpeciesCatalogue.all.filter { $0.name.lowercased().contains(query) }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    if let selected {
                        namingCard(for: selected)
                    }

                    if !inSeason.isEmpty {
                        speciesSection(
                            title: "Good to sow now",
                            subtitle: monthName + " is the right time for these.",
                            species: inSeason
                        )
                    }

                    if !outOfSeason.isEmpty {
                        speciesSection(
                            title: "Out of season",
                            subtitle: "You can still plant these - they just will not be at their best.",
                            species: outOfSeason
                        )
                    }
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 30)
            }
            .background(Theme.background)
            .searchable(text: $search, prompt: "Search plants")
            .navigationTitle("Plant something")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Plant") {
                        if let selected {
                            garden.plant(species: selected, nickname: nickname, inPlot: plot)
                            dismiss()
                        }
                    }
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .disabled(selected == nil)
                }
            }
        }
    }

    private var monthName: String {
        DateFormatter().monthSymbols[month - 1]
    }

    private func namingCard(for species: Species) -> some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                SectionHeader(title: "Name it",
                              subtitle: "Plants you have named are plants you remember to water.")
                TextField(species.name, text: $nickname)
                    .font(.system(size: 16, design: .rounded))
                    .padding(12)
                    .background(Theme.surfaceAlt)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                HStack(spacing: 6) {
                    Pill(text: species.light.label, systemImage: species.light.icon, tint: Theme.sun)
                    Pill(text: "\(species.daysToHarvest) days", systemImage: "calendar")
                    Pill(text: species.difficultyLabel, systemImage: "gauge.medium", tint: Theme.soil)
                }

                Text(species.tip)
                    .font(.system(size: 13, design: .rounded))
                    .foregroundStyle(Theme.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func speciesSection(title: String, subtitle: String, species: [Species]) -> some View {
        Card(padding: 14) {
            VStack(alignment: .leading, spacing: 12) {
                SectionHeader(title: title, subtitle: subtitle)
                VStack(spacing: 8) {
                    ForEach(species) { item in
                        SpeciesRow(species: item, isSelected: selected?.id == item.id) {
                            Haptics.selection()
                            selected = item
                            nickname = ""
                        }
                    }
                }
            }
        }
    }
}

private struct SpeciesRow: View {
    let species: Species
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                ZStack(alignment: .bottom) {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(Theme.surfaceAlt)
                        .frame(width: 46, height: 46)
                    PlantSprite(family: species.family, progress: 0.8, seed: species.id.count, height: 42)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(species.name)
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                        .foregroundStyle(Theme.ink)
                    Text("\(species.family.label) · \(species.light.label) · \(species.daysToHarvest) days")
                        .font(.system(size: 12, design: .rounded))
                        .foregroundStyle(Theme.inkSoft)
                }

                Spacer(minLength: 0)

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 20))
                    .foregroundStyle(isSelected ? Theme.leaf : Theme.leafPale)
            }
            .padding(8)
            .background(isSelected ? Theme.leafPale.opacity(0.35) : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}
