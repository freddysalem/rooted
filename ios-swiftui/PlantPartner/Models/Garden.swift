import Foundation
import SwiftUI

/// The shape of the allotment map. Kept outside `Garden` so it can be read from
/// anywhere, including stored-property initialisers in views.
enum Plot {
    static let columns = 3
    static let rows = 4
    static var count: Int { columns * rows }
}

/// Everything the app knows about your plot. One store, saved as JSON on disk.
///
/// Driven entirely from the UI, so every mutation already happens on the main thread.
final class Garden: ObservableObject {

    @Published private(set) var plantings: [Planting] = []
    @Published private(set) var earnedBadgeIDs: Set<String> = []
    @Published private(set) var hasSurveyedSun = false

    /// Set when a badge is earned so the UI can celebrate it once.
    @Published var justEarned: Badge?

    /// Latest weather, refreshed by the views. Watering advice leans on this.
    @Published var weather: WeatherSnapshot?

    private let store = GardenStore()

    init() {
        let state = store.load()
        plantings = state.plantings
        earnedBadgeIDs = state.earnedBadgeIDs
        hasSurveyedSun = state.hasSurveyedSun
    }

    // MARK: - Reading

    func planting(inPlot plot: Int) -> Planting? {
        plantings.first { $0.plot == plot }
    }

    var firstEmptyPlot: Int? {
        (0..<Plot.count).first { planting(inPlot: $0) == nil }
    }

    /// Plants that want water today, given the weather.
    var thirsty: [Planting] {
        plantings.filter { needsWater($0) }
    }

    func needsWater(_ planting: Planting) -> Bool {
        let since = planting.lastWatered ?? planting.plantedOn
        let days = Calendar.current.dateComponents([.day], from: since, to: Date()).day ?? 0
        return days >= wateringInterval(for: planting)
    }

    /// The species' usual interval, nudged by what the sky is doing.
    func wateringInterval(for planting: Planting) -> Int {
        var interval = planting.species.waterEveryDays
        guard let weather else { return interval }
        if weather.rainfallLast24h >= 4 { interval += 2 }
        else if weather.rainfallLast24h >= 1 { interval += 1 }
        if weather.highC >= 26 { interval -= 1 }
        return max(interval, 1)
    }

    func wateringAdvice(for planting: Planting) -> String {
        guard let weather else {
            return needsWater(planting) ? "Due a water." : "Happy for now."
        }
        if weather.rainfallLast24h >= 4 {
            return "\(Int(weather.rainfallLast24h))mm of rain overnight - the sky has done this one for you."
        }
        if weather.highC >= 26 {
            return "Reaching \(Int(weather.highC))°C today. Water early or late, never in full midday sun."
        }
        if needsWater(planting) {
            return "Due a water today."
        }
        let interval = wateringInterval(for: planting)
        let since = planting.lastWatered ?? planting.plantedOn
        let days = Calendar.current.dateComponents([.day], from: since, to: Date()).day ?? 0
        let left = max(interval - days, 0)
        return left <= 1 ? "Check again tomorrow." : "Happy for another \(left) days."
    }

    var totalWaterings: Int {
        plantings.reduce(0) { $0 + $1.wateringCount }
    }

    // MARK: - Writing

    func plant(species: Species, nickname: String, inPlot plot: Int) {
        guard planting(inPlot: plot) == nil else { return }
        let name = nickname.trimmingCharacters(in: .whitespacesAndNewlines)
        let new = Planting(
            speciesID: species.id,
            nickname: name.isEmpty ? species.name : name,
            plantedOn: Date(),
            plot: plot
        )
        plantings.append(new)
        Haptics.success()
        persist()
    }

    func water(_ planting: Planting) {
        guard let index = plantings.firstIndex(where: { $0.id == planting.id }) else { return }
        plantings[index].lastWatered = Date()
        plantings[index].wateringCount += 1
        Haptics.tap(.light)
        persist()
    }

    func recordHeight(_ centimetres: Double, for planting: Planting) {
        guard let index = plantings.firstIndex(where: { $0.id == planting.id }) else { return }
        plantings[index].heights.append(HeightEntry(date: Date(), centimetres: centimetres))
        persist()
    }

    func updateNotes(_ notes: String, for planting: Planting) {
        guard let index = plantings.firstIndex(where: { $0.id == planting.id }) else { return }
        plantings[index].notes = notes
        persist()
    }

    func remove(_ planting: Planting) {
        plantings.removeAll { $0.id == planting.id }
        persist()
    }

    func markSunSurveyed() {
        guard !hasSurveyedSun else { return }
        hasSurveyedSun = true
        persist()
    }

    // MARK: - Badges

    /// Badges are sticky: once earned they stay earned, even if you pull the plant up.
    private func refreshBadges() {
        var earned = earnedBadgeIDs

        func award(_ id: String, when condition: Bool) {
            guard condition, !earned.contains(id) else { return }
            earned.insert(id)
            if justEarned == nil, let badge = BadgeCatalogue.badge(id: id) {
                justEarned = badge
                Haptics.success()
            }
        }

        let families = Set(plantings.map { $0.species.family })
        let pollinatorFriendly: Set<String> = ["sunflower", "strawberry", "courgette", "runnerbean", "rosemary", "chives", "mint"]

        award("first_sprout", when: !plantings.isEmpty)
        award("five_plants", when: plantings.count >= 5)
        award("full_plot", when: plantings.count >= Plot.count)
        award("faithful", when: totalWaterings >= 20)
        award("harvest", when: plantings.contains { $0.stage == .ready })
        award("measured", when: plantings.contains { $0.heights.count >= 3 })
        award("sun_seeker", when: hasSurveyedSun)
        award("variety", when: families.count >= 4)
        award("winter", when: Calendar.current.component(.month, from: Date()) == 12 && !plantings.isEmpty)
        award("pollinator", when: plantings.contains { pollinatorFriendly.contains($0.speciesID) })

        earnedBadgeIDs = earned
    }

    func hasEarned(_ badge: Badge) -> Bool {
        earnedBadgeIDs.contains(badge.id)
    }

    // MARK: - Persistence

    private func persist() {
        refreshBadges()
        store.save(GardenState(
            plantings: plantings,
            earnedBadgeIDs: earnedBadgeIDs,
            hasSurveyedSun: hasSurveyedSun
        ))
    }

    /// Called on launch so time-based badges (harvest, winter) catch up.
    func refreshOnAppear() {
        refreshBadges()
    }
}
