import Foundation

/// Private, collectible, tied to a real growing milestone. Deliberately not a leaderboard -
/// nobody should feel behind because their neighbour has a bigger plot.
struct Badge: Identifiable, Hashable {
    let id: String
    let name: String
    let blurb: String
    let symbol: String
}

enum BadgeCatalogue {
    static let all: [Badge] = [
        Badge(id: "first_sprout", name: "First Sprout",
              blurb: "You planted your very first thing.", symbol: "leaf.fill"),
        Badge(id: "five_plants", name: "Green Fingers",
              blurb: "Five plants in the ground at once.", symbol: "hand.raised.fill"),
        Badge(id: "full_plot", name: "Full Plot",
              blurb: "Every bed in the allotment is planted.", symbol: "square.grid.3x3.fill"),
        Badge(id: "faithful", name: "Faithful",
              blurb: "Twenty waterings logged.", symbol: "drop.fill"),
        Badge(id: "harvest", name: "Harvest Day",
              blurb: "Grew something all the way to ready.", symbol: "basket.fill"),
        Badge(id: "measured", name: "Tape Measure",
              blurb: "Recorded three heights for one plant.", symbol: "ruler.fill"),
        Badge(id: "sun_seeker", name: "Sun Seeker",
              blurb: "Surveyed a spot with the sun tool.", symbol: "sun.max.fill"),
        Badge(id: "variety", name: "Mixed Bed",
              blurb: "Growing four different families at once.", symbol: "circle.hexagongrid.fill"),
        Badge(id: "winter", name: "Winter Grower",
              blurb: "Kept something alive through December.", symbol: "snowflake"),
        Badge(id: "pollinator", name: "Bee Friendly",
              blurb: "Planted something the pollinators need.", symbol: "ant.fill"),
    ]

    static func badge(id: String) -> Badge? {
        all.first { $0.id == id }
    }
}
