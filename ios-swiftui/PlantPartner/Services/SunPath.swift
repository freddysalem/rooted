import Foundation

struct SunPosition {
    /// Degrees clockwise from true north.
    var azimuth: Double
    /// Degrees above the horizon. Negative means the sun is down.
    var elevation: Double

    var isUp: Bool { elevation > 0 }
}

/// Where the sun actually is, from date and coordinates.
///
/// This is the low-precision solar position algorithm published by the US Naval
/// Observatory - accurate to roughly a tenth of a degree, which is far beyond what
/// "should I put tomatoes here" requires.
enum SunPath {

    static func position(at date: Date, latitude: Double, longitude: Double) -> SunPosition {
        let d = julianDaysSinceJ2000(date)

        // Mean longitude and mean anomaly of the sun.
        let meanLongitude = normalise(280.460 + 0.9856474 * d)
        let meanAnomaly = radians(normalise(357.528 + 0.9856003 * d))

        // Ecliptic longitude, correcting for the orbit not being circular.
        let eclipticLongitude = radians(normalise(
            meanLongitude + 1.915 * sin(meanAnomaly) + 0.020 * sin(2 * meanAnomaly)
        ))

        let obliquity = radians(23.439 - 0.0000004 * d)

        // Convert to equatorial coordinates.
        let rightAscension = atan2(cos(obliquity) * sin(eclipticLongitude), cos(eclipticLongitude))
        let declination = asin(sin(obliquity) * sin(eclipticLongitude))

        // Local sidereal time gives us the hour angle.
        let gmst = normalise(hours: 18.697374558 + 24.06570982441908 * d)
        let localSiderealDegrees = normalise(gmst * 15 + longitude)
        let hourAngle = radians(normalise(localSiderealDegrees - degrees(rightAscension)))

        let lat = radians(latitude)
        let elevation = asin(sin(lat) * sin(declination) + cos(lat) * cos(declination) * cos(hourAngle))
        let azimuth = atan2(
            -sin(hourAngle),
            tan(declination) * cos(lat) - sin(lat) * cos(hourAngle)
        )

        return SunPosition(
            azimuth: normalise(degrees(azimuth)),
            elevation: degrees(elevation)
        )
    }

    /// The sun's track across one day, sampled every `stepMinutes`.
    static func arc(for date: Date, latitude: Double, longitude: Double, stepMinutes: Int = 15) -> [(Date, SunPosition)] {
        let start = Calendar.current.startOfDay(for: date)
        var samples: [(Date, SunPosition)] = []
        var minute = 0
        while minute < 24 * 60 {
            let moment = start.addingTimeInterval(TimeInterval(minute * 60))
            samples.append((moment, position(at: moment, latitude: latitude, longitude: longitude)))
            minute += stepMinutes
        }
        return samples
    }

    /// Hours of direct sun a spot gets, given which way it faces and how high the
    /// surroundings are.
    ///
    /// The model: a spot facing `bearing` catches the sun whenever the sun is above the
    /// horizon, within 90° either side of that bearing, and high enough to clear whatever
    /// is around it. `obstructionDegrees` is the elevation of the skyline - 0 for an open
    /// field, 25 or so for a spot hemmed in by houses.
    static func directSunHours(
        date: Date,
        latitude: Double,
        longitude: Double,
        bearing: Double,
        obstructionDegrees: Double = 12
    ) -> Double {
        let stepMinutes = 10
        let samples = arc(for: date, latitude: latitude, longitude: longitude, stepMinutes: stepMinutes)
        let lit = samples.filter { _, position in
            guard position.elevation > obstructionDegrees else { return false }
            return angularDistance(position.azimuth, bearing) <= 90
        }
        return Double(lit.count) * Double(stepMinutes) / 60.0
    }

    /// Which plants suit a spot with this much direct sun.
    static func lightNeed(forHours hours: Double) -> LightNeed {
        if hours >= 6 { return .fullSun }
        if hours >= 3 { return .partialShade }
        return .shade
    }

    static func sunrise(latitude: Double, longitude: Double, date: Date = Date()) -> Date? {
        arc(for: date, latitude: latitude, longitude: longitude, stepMinutes: 5)
            .first { $0.1.isUp }?.0
    }

    static func sunset(latitude: Double, longitude: Double, date: Date = Date()) -> Date? {
        arc(for: date, latitude: latitude, longitude: longitude, stepMinutes: 5)
            .last { $0.1.isUp }?.0
    }

    // MARK: - Maths helpers

    /// Smallest angle between two compass bearings, 0...180.
    static func angularDistance(_ a: Double, _ b: Double) -> Double {
        let diff = abs(normalise(a - b))
        return diff > 180 ? 360 - diff : diff
    }

    static func compassLabel(_ bearing: Double) -> String {
        let points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
        let index = Int((normalise(bearing) / 45).rounded()) % 8
        return points[index]
    }

    private static func julianDaysSinceJ2000(_ date: Date) -> Double {
        date.timeIntervalSince1970 / 86_400.0 + 2_440_587.5 - 2_451_545.0
    }

    private static func radians(_ degrees: Double) -> Double { degrees * .pi / 180 }
    private static func degrees(_ radians: Double) -> Double { radians * 180 / .pi }

    private static func normalise(_ degrees: Double) -> Double {
        let value = degrees.truncatingRemainder(dividingBy: 360)
        return value < 0 ? value + 360 : value
    }

    private static func normalise(hours: Double) -> Double {
        let value = hours.truncatingRemainder(dividingBy: 24)
        return value < 0 ? value + 24 : value
    }
}
