import Foundation

struct GardenState: Codable {
    var plantings: [Planting] = []
    var earnedBadgeIDs: Set<String> = []
    var hasSurveyedSun: Bool = false
}

/// Plain JSON on disk. The garden is small and rarely written, so there is no need
/// for a database here - and it keeps the whole state trivially inspectable.
struct GardenStore {
    private let filename = "garden.json"

    private var fileURL: URL? {
        guard let dir = try? FileManager.default.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        ) else { return nil }
        let folder = dir.appendingPathComponent("PlantPartner", isDirectory: true)
        if !FileManager.default.fileExists(atPath: folder.path) {
            try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        }
        return folder.appendingPathComponent(filename)
    }

    func load() -> GardenState {
        guard let fileURL, let data = try? Data(contentsOf: fileURL) else { return GardenState() }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return (try? decoder.decode(GardenState.self, from: data)) ?? GardenState()
    }

    func save(_ state: GardenState) {
        guard let fileURL else { return }
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        guard let data = try? encoder.encode(state) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }
}
