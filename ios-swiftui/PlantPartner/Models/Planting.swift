import Foundation

/// One measurement from the photo-and-reference-object flow.
struct HeightEntry: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var date: Date
    var centimetres: Double
}

/// Something actually growing in the user's plot.
struct Planting: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var speciesID: String
    var nickname: String
    var plantedOn: Date
    var lastWatered: Date?
    var wateringCount: Int = 0
    /// Index into the allotment grid.
    var plot: Int
    var heights: [HeightEntry] = []
    var notes: String = ""

    var species: Species {
        SpeciesCatalogue.species(id: speciesID) ?? SpeciesCatalogue.all[0]
    }

    var daysSincePlanting: Int {
        Calendar.current.dateComponents([.day], from: plantedOn, to: Date()).day ?? 0
    }

    /// 0 = just sown, 1 = ready to harvest. Drives the on-screen plant's size.
    var progress: Double {
        let p = Double(daysSincePlanting) / Double(max(species.daysToHarvest, 1))
        return min(max(p, 0), 1)
    }

    var stage: GrowthStage {
        switch progress {
        case ..<0.08:  return .sown
        case ..<0.30:  return .sprouting
        case ..<0.60:  return .growing
        case ..<0.95:  return .established
        default:       return .ready
        }
    }

    var daysUntilHarvest: Int {
        max(species.daysToHarvest - daysSincePlanting, 0)
    }

    var latestHeight: Double? {
        heights.sorted { $0.date < $1.date }.last?.centimetres
    }

    /// Growth since the first recorded measurement, in cm.
    var heightGain: Double? {
        let sorted = heights.sorted { $0.date < $1.date }
        guard let first = sorted.first, let last = sorted.last, sorted.count > 1 else { return nil }
        return last.centimetres - first.centimetres
    }
}

enum GrowthStage: String, Codable {
    case sown, sprouting, growing, established, ready

    var label: String {
        switch self {
        case .sown:        return "Just sown"
        case .sprouting:   return "Sprouting"
        case .growing:     return "Growing"
        case .established: return "Established"
        case .ready:       return "Ready to harvest"
        }
    }
}
