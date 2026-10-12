import Foundation

enum PlantFamily: String, Codable, CaseIterable {
    case leafy, root, fruiting, herb, flower

    var label: String {
        switch self {
        case .leafy:    return "Leafy green"
        case .root:     return "Root veg"
        case .fruiting: return "Fruiting"
        case .herb:     return "Herb"
        case .flower:   return "Flower"
        }
    }
}

enum LightNeed: String, Codable, CaseIterable {
    case fullSun, partialShade, shade

    var label: String {
        switch self {
        case .fullSun:      return "Full sun"
        case .partialShade: return "Partial shade"
        case .shade:        return "Shade tolerant"
        }
    }

    var icon: String {
        switch self {
        case .fullSun:      return "sun.max.fill"
        case .partialShade: return "cloud.sun.fill"
        case .shade:        return "cloud.fill"
        }
    }

    /// Rough hours of direct sun a spot needs to suit this plant.
    var minimumDirectHours: Double {
        switch self {
        case .fullSun:      return 6
        case .partialShade: return 3
        case .shade:        return 0
        }
    }
}

/// A kind of plant you can grow. Static reference data - never mutated.
struct Species: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let family: PlantFamily
    let light: LightNeed
    /// How often it wants watering in fair weather.
    let waterEveryDays: Int
    /// Sow-to-harvest, used to drive the growth animation.
    let daysToHarvest: Int
    /// Month numbers (1-12).
    let sowMonths: [Int]
    let harvestMonths: [Int]
    let difficulty: Int          // 1 easy ... 3 fussy
    let tip: String

    var difficultyLabel: String {
        switch difficulty {
        case 1:  return "Easy"
        case 2:  return "Steady"
        default: return "Needs attention"
        }
    }
}

/// The starter catalogue. UK growing calendar - the app is pitched at British allotments
/// and windowsills, so months follow a temperate northern-hemisphere season.
enum SpeciesCatalogue {
    static let all: [Species] = [
        Species(id: "radish", name: "Radish", family: .root, light: .partialShade,
                waterEveryDays: 2, daysToHarvest: 28, sowMonths: [3,4,5,6,7,8,9], harvestMonths: [4,5,6,7,8,9,10],
                difficulty: 1, tip: "The fastest win in the garden. Sow a short row every fortnight and you will never be without."),
        Species(id: "lettuce", name: "Lettuce", family: .leafy, light: .partialShade,
                waterEveryDays: 2, daysToHarvest: 45, sowMonths: [3,4,5,6,7,8], harvestMonths: [5,6,7,8,9,10],
                difficulty: 1, tip: "Pick the outer leaves and leave the heart - one plant will feed you for weeks."),
        Species(id: "spinach", name: "Spinach", family: .leafy, light: .partialShade,
                waterEveryDays: 2, daysToHarvest: 40, sowMonths: [3,4,5,6,7,8,9], harvestMonths: [5,6,7,8,9,10],
                difficulty: 1, tip: "Bolts in a heatwave. Give it some afternoon shade and keep the soil damp."),
        Species(id: "chard", name: "Swiss chard", family: .leafy, light: .partialShade,
                waterEveryDays: 2, daysToHarvest: 55, sowMonths: [4,5,6,7,8], harvestMonths: [6,7,8,9,10,11],
                difficulty: 1, tip: "Almost impossible to kill and the stems are as good as the leaves."),
        Species(id: "kale", name: "Kale", family: .leafy, light: .partialShade,
                waterEveryDays: 3, daysToHarvest: 75, sowMonths: [4,5,6], harvestMonths: [10,11,12,1,2,3],
                difficulty: 1, tip: "Tastes better after a frost. This is the one that keeps the plot alive in winter."),
        Species(id: "carrot", name: "Carrot", family: .root, light: .fullSun,
                waterEveryDays: 3, daysToHarvest: 80, sowMonths: [4,5,6,7], harvestMonths: [7,8,9,10],
                difficulty: 2, tip: "Stones make forked carrots. Sift the soil first and sow thinly - thinning attracts carrot fly."),
        Species(id: "beetroot", name: "Beetroot", family: .root, light: .fullSun,
                waterEveryDays: 3, daysToHarvest: 70, sowMonths: [4,5,6,7], harvestMonths: [6,7,8,9,10],
                difficulty: 1, tip: "Each seed is really a cluster, so expect a little huddle of seedlings to thin out."),
        Species(id: "potato", name: "Potato", family: .root, light: .fullSun,
                waterEveryDays: 4, daysToHarvest: 100, sowMonths: [3,4], harvestMonths: [6,7,8,9],
                difficulty: 1, tip: "Earth up the stems as they grow - any tuber that sees daylight turns green and inedible."),
        Species(id: "onion", name: "Onion", family: .root, light: .fullSun,
                waterEveryDays: 4, daysToHarvest: 150, sowMonths: [3,4], harvestMonths: [8,9],
                difficulty: 1, tip: "When the tops flop over of their own accord, they are telling you they are ready."),
        Species(id: "garlic", name: "Garlic", family: .root, light: .fullSun,
                waterEveryDays: 7, daysToHarvest: 240, sowMonths: [10,11], harvestMonths: [6,7],
                difficulty: 1, tip: "Plant in autumn. It needs a cold spell to split into cloves rather than one round bulb."),
        Species(id: "tomato", name: "Tomato", family: .fruiting, light: .fullSun,
                waterEveryDays: 2, daysToHarvest: 100, sowMonths: [3,4], harvestMonths: [7,8,9],
                difficulty: 2, tip: "Water little and often. Sudden soaking after a dry spell splits the fruit."),
        Species(id: "courgette", name: "Courgette", family: .fruiting, light: .fullSun,
                waterEveryDays: 2, daysToHarvest: 60, sowMonths: [4,5,6], harvestMonths: [7,8,9],
                difficulty: 1, tip: "Pick them small and often. Turn your back for a week and you have a marrow."),
        Species(id: "runnerbean", name: "Runner bean", family: .fruiting, light: .fullSun,
                waterEveryDays: 2, daysToHarvest: 90, sowMonths: [5,6], harvestMonths: [7,8,9,10],
                difficulty: 1, tip: "Give it something tall to climb before you plant it, not after."),
        Species(id: "pea", name: "Pea", family: .fruiting, light: .fullSun,
                waterEveryDays: 3, daysToHarvest: 70, sowMonths: [3,4,5,6], harvestMonths: [6,7,8],
                difficulty: 1, tip: "Pick from the bottom up, and pick often - it tells the plant to keep making more."),
        Species(id: "strawberry", name: "Strawberry", family: .fruiting, light: .fullSun,
                waterEveryDays: 2, daysToHarvest: 120, sowMonths: [3,4,9], harvestMonths: [6,7,8],
                difficulty: 2, tip: "Tuck straw underneath so the fruit never touches wet soil."),
        Species(id: "basil", name: "Basil", family: .herb, light: .fullSun,
                waterEveryDays: 2, daysToHarvest: 50, sowMonths: [4,5,6], harvestMonths: [6,7,8,9],
                difficulty: 2, tip: "A windowsill plant in Britain. Pinch out the top pair of leaves to stop it going lanky."),
        Species(id: "mint", name: "Mint", family: .herb, light: .shade,
                waterEveryDays: 2, daysToHarvest: 60, sowMonths: [4,5,6,7,8], harvestMonths: [5,6,7,8,9,10],
                difficulty: 1, tip: "Keep it in a pot. Planted free in a bed it will take the whole thing over."),
        Species(id: "chives", name: "Chives", family: .herb, light: .partialShade,
                waterEveryDays: 3, daysToHarvest: 60, sowMonths: [3,4,5], harvestMonths: [5,6,7,8,9,10],
                difficulty: 1, tip: "Cut it back hard mid-season and you get a fresh flush of tender leaves."),
        Species(id: "rosemary", name: "Rosemary", family: .herb, light: .fullSun,
                waterEveryDays: 7, daysToHarvest: 180, sowMonths: [4,5,6], harvestMonths: [1,2,3,4,5,6,7,8,9,10,11,12],
                difficulty: 2, tip: "Far more rosemary is killed by kindness than by neglect. Let it dry out between waterings."),
        Species(id: "sunflower", name: "Sunflower", family: .flower, light: .fullSun,
                waterEveryDays: 3, daysToHarvest: 90, sowMonths: [4,5], harvestMonths: [8,9],
                difficulty: 1, tip: "Not food exactly, but the bees need it and the seeds will feed the birds all winter."),
    ]

    static func species(id: String) -> Species? {
        all.first { $0.id == id }
    }

    static func sowable(in month: Int) -> [Species] {
        all.filter { $0.sowMonths.contains(month) }
    }

    static func harvestable(in month: Int) -> [Species] {
        all.filter { $0.harvestMonths.contains(month) }
    }
}
