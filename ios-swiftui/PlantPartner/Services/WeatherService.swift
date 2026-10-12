import Foundation

struct WeatherSnapshot: Equatable {
    var temperatureC: Double
    var highC: Double
    var lowC: Double
    var condition: WeatherCondition
    /// Millimetres in the last 24 hours.
    var rainfallLast24h: Double
    var willRainToday: Bool
    var placeName: String

    var summary: String {
        "\(Int(temperatureC.rounded()))°C  ·  \(condition.label)"
    }
}

enum WeatherCondition: String, Equatable {
    case clear, partlyCloudy, cloudy, rain, storm, frost

    var label: String {
        switch self {
        case .clear:        return "Clear"
        case .partlyCloudy: return "Partly cloudy"
        case .cloudy:       return "Overcast"
        case .rain:         return "Rain"
        case .storm:        return "Storm"
        case .frost:        return "Frost"
        }
    }

    var icon: String {
        switch self {
        case .clear:        return "sun.max.fill"
        case .partlyCloudy: return "cloud.sun.fill"
        case .cloudy:       return "cloud.fill"
        case .rain:         return "cloud.rain.fill"
        case .storm:        return "cloud.bolt.rain.fill"
        case .frost:        return "snowflake"
        }
    }

    /// Warnings worth pushing at the user, per the heat/storm alert idea.
    var alert: String? {
        switch self {
        case .storm: return "Storm forecast - stake anything tall and move pots against a wall."
        case .frost: return "Frost tonight - fleece the tender plants or bring them in."
        default:     return nil
        }
    }
}

protocol WeatherProviding {
    func snapshot() async -> WeatherSnapshot
}

/// Stand-in weather source.
///
/// Swapping in Apple's real data is a drop-in replacement: make a `WeatherKitProvider`
/// that conforms to `WeatherProviding`, call `WeatherService.shared.weather(for:)`, and
/// map its `currentWeather` / `dailyForecast` onto `WeatherSnapshot`. That needs a paid
/// Apple Developer account for the WeatherKit entitlement, which is why the app ships
/// against this provider first - every screen above it stays identical.
struct SeasonalMockWeather: WeatherProviding {
    var placeName: String = "Your garden"

    func snapshot() async -> WeatherSnapshot {
        let calendar = Calendar.current
        let now = Date()
        let month = calendar.component(.month, from: now)
        let dayOfYear = calendar.ordinality(of: .day, in: .year, for: now) ?? 180

        // A rough British year: cold and wet at the ends, mild and brighter in the middle.
        let seasonal = -cos(Double(dayOfYear) / 365.0 * 2 * .pi) // -1 in January, +1 in July
        let baseHigh = 11.5 + seasonal * 8.0
        let jitter = Self.pseudoRandom(seed: dayOfYear) // stable for a whole day

        let high = baseHigh + (jitter - 0.5) * 6
        let low = high - (4 + jitter * 4)
        let current = low + (high - low) * 0.7

        let wetness = jitter * (month <= 3 || month >= 10 ? 1.5 : 0.85)
        let rainfall = wetness > 0.62 ? (wetness - 0.62) * 22 : 0

        let condition: WeatherCondition
        if low <= 0.5 { condition = .frost }
        else if wetness > 0.90 { condition = .storm }
        else if rainfall > 0 { condition = .rain }
        else if wetness > 0.45 { condition = .cloudy }
        else if wetness > 0.25 { condition = .partlyCloudy }
        else { condition = .clear }

        return WeatherSnapshot(
            temperatureC: current,
            highC: high,
            lowC: low,
            condition: condition,
            rainfallLast24h: rainfall,
            willRainToday: rainfall > 0.5,
            placeName: placeName
        )
    }

    /// Deterministic 0...1 from a seed, so the weather does not flicker on every redraw.
    private static func pseudoRandom(seed: Int) -> Double {
        let x = sin(Double(seed) * 12.9898) * 43758.5453
        return x - x.rounded(.down)
    }
}
