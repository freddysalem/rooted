import Foundation
import CoreLocation
import Combine

/// Coordinates and compass heading, with a sensible fallback so the sun tool is never
/// a dead end - on the Simulator, or with location refused, it falls back to Bristol.
final class LocationProvider: NSObject, ObservableObject {

    static let fallbackCoordinate = CLLocationCoordinate2D(latitude: 51.4545, longitude: -2.5879)
    static let fallbackName = "Bristol"

    @Published private(set) var coordinate: CLLocationCoordinate2D?
    @Published private(set) var heading: Double = 180
    @Published private(set) var authorisation: CLAuthorizationStatus = .notDetermined
    @Published private(set) var isUsingFallback = true

    private let manager = CLLocationManager()

    var latitude: Double { coordinate?.latitude ?? Self.fallbackCoordinate.latitude }
    var longitude: Double { coordinate?.longitude ?? Self.fallbackCoordinate.longitude }

    var headingAvailable: Bool { CLLocationManager.headingAvailable() }

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        authorisation = manager.authorizationStatus
    }

    func start() {
        if manager.authorizationStatus == .notDetermined {
            manager.requestWhenInUseAuthorization()
        }
        manager.startUpdatingLocation()
        if CLLocationManager.headingAvailable() {
            manager.startUpdatingHeading()
        }
    }

    func stop() {
        manager.stopUpdatingLocation()
        manager.stopUpdatingHeading()
    }
}

extension LocationProvider: CLLocationManagerDelegate {

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        DispatchQueue.main.async {
            self.authorisation = status
            if status == .authorizedWhenInUse || status == .authorizedAlways {
                manager.startUpdatingLocation()
                if CLLocationManager.headingAvailable() {
                    manager.startUpdatingHeading()
                }
            }
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        let coordinate = location.coordinate
        DispatchQueue.main.async {
            self.coordinate = coordinate
            self.isUsingFallback = false
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        let value = newHeading.trueHeading >= 0 ? newHeading.trueHeading : newHeading.magneticHeading
        DispatchQueue.main.async {
            self.heading = value
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        DispatchQueue.main.async {
            self.isUsingFallback = true
        }
    }
}
