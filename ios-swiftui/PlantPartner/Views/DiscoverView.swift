import SwiftUI

/// What the month is good for. The whole tab answers one question: if I went outside
/// right now, what should I be doing?
struct DiscoverView: View {
    @EnvironmentObject private var garden: Garden

    private var month: Int { Calendar.current.component(.month, from: Date()) }
    private var monthName: String { DateFormatter().monthSymbols[month - 1] }

    private var harvesting: [Species] { SpeciesCatalogue.harvestable(in: month) }
    private var sowing: [Species] { SpeciesCatalogue.sowable(in: month) }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    monthCard

                    if !harvesting.isEmpty {
                        speciesCarousel(
                            title: "In season now",
                            subtitle: "Ready to eat somewhere in Britain this month.",
                            species: harvesting
                        )
                    }

                    if !sowing.isEmpty {
                        speciesCarousel(
                            title: "Sow in \(monthName)",
                            subtitle: "Get these in the ground and they will have time to finish.",
                            species: sowing
                        )
                    }

                    jobsCard
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 30)
            }
            .background(Theme.background)
            .navigationTitle("Discover")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var monthCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 6) {
                Text(monthName)
                    .font(.system(size: 26, weight: .bold, design: .rounded))
                    .foregroundStyle(Theme.ink)
                Text(monthBlurb)
                    .font(.system(size: 14, design: .rounded))
                    .foregroundStyle(Theme.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private var monthBlurb: String {
        switch month {
        case 1:  return "The quiet month. Order seed, chit potatoes on a windowsill, and let the frost break up the soil for you."
        case 2:  return "Things stir. Sow the first broad beans and get the beds cleared before everything happens at once."
        case 3:  return "The season opens. Almost everything can be started now, indoors if not out."
        case 4:  return "The busiest sowing month of the year. Watch for a late frost - it catches people every spring."
        case 5:  return "Plant out the tender things once the frosts are properly done. Water new transplants daily for a week."
        case 6:  return "Everything is growing at once. Keep on top of the weeding now and the rest of the summer is easy."
        case 7:  return "Peak watering. Early morning is worth twice what the same water is worth at midday."
        case 8:  return "Harvest and keep harvesting - courgettes and beans stop producing the moment you let them go over."
        case 9:  return "The soft landing. Sow overwintering greens and plant garlic at the end of the month."
        case 10: return "Clear the spent beds, but leave some seed heads standing for the birds."
        case 11: return "Mulch what is left and let the worms do the digging for you over winter."
        default: return "Kale, leeks and patience. Plan next year while this one is still fresh in your mind."
        }
    }

    private func speciesCarousel(title: String, subtitle: String, species: [Species]) -> some View {
        Card(padding: 14) {
            VStack(alignment: .leading, spacing: 12) {
                SectionHeader(title: title, subtitle: subtitle)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(species) { item in
                            SpeciesCard(species: item)
                        }
                    }
                    .padding(.vertical, 2)
                }
            }
        }
    }

    /// Seasonal jobs, and the ones your own plot is asking for.
    private var jobsCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                SectionHeader(title: "This week", subtitle: "Small jobs that pay off later.")
                ForEach(Array(jobs.enumerated()), id: \.offset) { _, job in
                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: "circle.fill")
                            .font(.system(size: 6))
                            .foregroundStyle(Theme.leafLight)
                            .padding(.top, 6)
                        Text(job)
                            .font(.system(size: 14, design: .rounded))
                            .foregroundStyle(Theme.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        Spacer(minLength: 0)
                    }
                }
            }
        }
    }

    private var jobs: [String] {
        var list: [String] = []
        let thirsty = garden.thirsty.count
        if thirsty > 0 {
            list.append(thirsty == 1
                        ? "One plant is due a water."
                        : "\(thirsty) plants are due a water.")
        }
        if garden.plantings.contains(where: { $0.stage == .ready }) {
            list.append("Something is ready to harvest - pick it before it goes over.")
        }
        if garden.plantings.contains(where: { $0.species.family == .fruiting && $0.progress > 0.5 }) {
            list.append("Pinch out side shoots on the fruiting plants.")
        }
        switch month {
        case 3...5:  list.append("Check for slugs after rain, in the evening - that is when they are out.")
        case 6...8:  list.append("Feed the fruiting plants once a week now they are flowering.")
        case 9...10: list.append("Collect seed from anything that did well this year.")
        default:     list.append("Turn the compost heap. It will be half the size by spring.")
        }
        if garden.firstEmptyPlot != nil {
            list.append("You have a spare bed. Something quick like radish will fill it in a month.")
        }
        return list
    }
}

private struct SpeciesCard: View {
    let species: Species

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack(alignment: .bottom) {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(
                        LinearGradient(colors: [Theme.sky.opacity(0.45), Theme.surfaceAlt],
                                       startPoint: .top, endPoint: .bottom)
                    )
                    .frame(width: 120, height: 92)
                PlantSprite(family: species.family, progress: 0.9, seed: species.id.count, height: 78)
            }

            Text(species.name)
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundStyle(Theme.ink)
            Text(species.light.label)
                .font(.system(size: 11, design: .rounded))
                .foregroundStyle(Theme.inkSoft)
        }
        .frame(width: 120, alignment: .leading)
    }
}
