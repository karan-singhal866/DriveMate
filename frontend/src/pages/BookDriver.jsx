import React, {
  useEffect,
  useRef,
  useState
} from "react";
import { useNavigate } from "react-router-dom";
import {
  setOptions,
  importLibrary
} from "@googlemaps/js-api-loader";

import api from "../services/api";
import BackButton from "../components/BackButton";
import socket from "../services/socket";

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export default function BookDriver() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [form, setForm] = useState({
    vehicleId: "",
    driverId: "",
    pickupLocation: "",
    destination: "",
    bookingDate: "",
    duration: 1,
    vehicleType: ""
  });

  const [error, setError] = useState("");

  const [mapError, setMapError] = useState("");
  const [mapsLoaded, setMapsLoaded] = useState(false);

  const [routeInfo, setRouteInfo] = useState({
    distance: "",
    duration: ""
  });

  const navigate = useNavigate();

  /*
   * Google Maps references
   */
  const mapContainerRef = useRef(null);

  const pickupContainerRef = useRef(null);
  const destinationContainerRef = useRef(null);

  const mapRef = useRef(null);

  const pickupMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);

  const routePolylinesRef = useRef([]);

  const pickupLocationRef = useRef(null);
  const destinationLocationRef = useRef(null);

  /*
   * Prevent Google Maps from being initialized
   * more than once.
   */
  const mapsInitializationRef = useRef(false);

  /*
   * Get minimum booking date/time.
   */
  function getMinBookingDateTime() {
    const now = new Date();

    const year = now.getFullYear();

    const month = String(
      now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      now.getDate()
    ).padStart(2, "0");

    const hours = String(
      now.getHours()
    ).padStart(2, "0");

    const minutes = String(
      now.getMinutes()
    ).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  /*
   * Load vehicles and available drivers.
   */
  const loadData = async () => {
    try {
      const [
        vehiclesResponse,
        driversResponse
      ] = await Promise.all([
        api.get("/vehicles/my"),
        api.get("/drivers/available")
      ]);

      setVehicles(
        vehiclesResponse.data.vehicles || []
      );

      setDrivers(
        driversResponse.data.drivers || []
      );
    } catch (error) {
      console.error(
        "Failed to load booking data:",
        error.response?.data ||
          error.message
      );

      setError(
        error.response?.data?.message ||
          "Failed to load vehicles and drivers."
      );
    }
  };

  /*
   * Initial data load.
   */
  useEffect(() => {
    loadData();
  }, []);

  /*
   * Real-time driver availability updates.
   */
  useEffect(() => {
    const handleDriverAvailabilityUpdated = (
      data
    ) => {
      console.log(
        "REAL-TIME DRIVER AVAILABILITY UPDATE:",
        data
      );

      loadData();
    };

    socket.on(
      "driverAvailabilityUpdated",
      handleDriverAvailabilityUpdated
    );

    return () => {
      socket.off(
        "driverAvailabilityUpdated",
        handleDriverAvailabilityUpdated
      );
    };
  }, []);

  /*
   * Load Google Maps.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadGoogleMaps() {
      console.log(
        "GOOGLE MAPS: Starting initialization..."
      );

      console.log(
        "GOOGLE MAPS: API key present:",
        Boolean(GOOGLE_MAPS_API_KEY)
      );

      if (!GOOGLE_MAPS_API_KEY) {
        console.error(
          "GOOGLE MAPS: VITE_GOOGLE_MAPS_API_KEY is missing from the frontend build."
        );

        if (!cancelled) {
          setMapError(
            "Google Maps API key is not available in this frontend build."
          );
        }

        return;
      }

      try {
        /*
         * Configure the Google Maps loader.
         */
        setOptions({
          key: GOOGLE_MAPS_API_KEY,
          v: "weekly"
        });

        console.log(
          "GOOGLE MAPS: Loader configured."
        );

        /*
         * Load the Maps library first.
         *
         * Other libraries are loaded later when needed.
         */
        await importLibrary("maps");

        if (cancelled) {
          return;
        }

        console.log(
          "GOOGLE MAPS: Maps library loaded successfully."
        );

        setMapsLoaded(true);
      } catch (error) {
        console.error(
          "GOOGLE MAPS: Loading failed:",
          error
        );

        if (!cancelled) {
          setMapError(
            "Google Maps could not be loaded. Check the browser console for the exact Google Maps error."
          );
        }
      }
    }

    loadGoogleMaps();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Initialize map and autocomplete after
   * the Maps library has loaded.
   */
  useEffect(() => {
    if (!mapsLoaded) {
      return;
    }

    if (mapsInitializationRef.current) {
      return;
    }

    if (!mapContainerRef.current) {
      console.error(
        "GOOGLE MAPS: Map container is not available."
      );

      return;
    }

    mapsInitializationRef.current = true;

    let cancelled = false;

    async function initializeGoogleMaps() {
      try {
        console.log(
          "GOOGLE MAPS: Initializing map..."
        );

        const [
          { Map },
          { PlaceAutocompleteElement },
          { AdvancedMarkerElement }
        ] = await Promise.all([
          importLibrary("maps"),
          importLibrary("places"),
          importLibrary("marker")
        ]);

        if (cancelled) {
          return;
        }

        /*
         * Create map.
         */
        const map = new Map(
          mapContainerRef.current,
          {
            center: {
              lat: 26.9124,
              lng: 75.7873
            },
            zoom: 12,

            /*
             * Required for AdvancedMarkerElement.
             * DEMO_MAP_ID is suitable for development/testing.
             */
            mapId: "DEMO_MAP_ID",

            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true
          }
        );

        mapRef.current = map;

        console.log(
          "GOOGLE MAPS: Map created successfully."
        );

        /*
         * Pickup autocomplete.
         */
        const pickupAutocomplete =
          new PlaceAutocompleteElement({
            placeholder:
              "Search pickup location",
            includedRegionCodes: ["in"]
          });

        /*
         * Destination autocomplete.
         */
        const destinationAutocomplete =
          new PlaceAutocompleteElement({
            placeholder:
              "Search destination",
            includedRegionCodes: ["in"]
          });

        pickupAutocomplete.style.width =
          "100%";

        destinationAutocomplete.style.width =
          "100%";

        /*
         * Add autocomplete elements.
         */
        if (
          pickupContainerRef.current
        ) {
          pickupContainerRef.current.innerHTML =
            "";

          pickupContainerRef.current.appendChild(
            pickupAutocomplete
          );
        }

        if (
          destinationContainerRef.current
        ) {
          destinationContainerRef.current.innerHTML =
            "";

          destinationContainerRef.current.appendChild(
            destinationAutocomplete
          );
        }

        /*
         * Pickup selection.
         */
        pickupAutocomplete.addEventListener(
          "gmp-select",
          async (event) => {
            try {
              const place =
                event.placePrediction.toPlace();

              await place.fetchFields({
                fields: [
                  "displayName",
                  "formattedAddress",
                  "location"
                ]
              });

              const location =
                place.location;

              if (!location) {
                setError(
                  "Pickup location coordinates could not be found."
                );

                return;
              }

              pickupLocationRef.current =
                location;

              const pickupText =
                place.formattedAddress ||
                place.displayName ||
                "";

              setForm((prev) => ({
                ...prev,
                pickupLocation:
                  pickupText
              }));

              /*
               * Remove old pickup marker.
               */
              if (
                pickupMarkerRef.current
              ) {
                pickupMarkerRef.current.map =
                  null;
              }

              /*
               * Add pickup marker.
               */
              pickupMarkerRef.current =
                new AdvancedMarkerElement({
                  map,
                  position: location,
                  title:
                    "Pickup Location"
                });

              map.panTo(location);

              /*
               * Calculate route if destination
               * is already selected.
               */
              if (
                destinationLocationRef.current
              ) {
                await calculateRoute(
                  location,
                  destinationLocationRef.current
                );
              }

              setError("");
            } catch (error) {
              console.error(
                "GOOGLE MAPS: Pickup selection error:",
                error
              );

              setError(
                "Could not select pickup location."
              );
            }
          }
        );

        /*
         * Destination selection.
         */
        destinationAutocomplete.addEventListener(
          "gmp-select",
          async (event) => {
            try {
              const place =
                event.placePrediction.toPlace();

              await place.fetchFields({
                fields: [
                  "displayName",
                  "formattedAddress",
                  "location"
                ]
              });

              const location =
                place.location;

              if (!location) {
                setError(
                  "Destination coordinates could not be found."
                );

                return;
              }

              destinationLocationRef.current =
                location;

              const destinationText =
                place.formattedAddress ||
                place.displayName ||
                "";

              setForm((prev) => ({
                ...prev,
                destination:
                  destinationText
              }));

              /*
               * Remove old destination marker.
               */
              if (
                destinationMarkerRef.current
              ) {
                destinationMarkerRef.current.map =
                  null;
              }

              /*
               * Add destination marker.
               */
              destinationMarkerRef.current =
                new AdvancedMarkerElement({
                  map,
                  position: location,
                  title:
                    "Destination"
                });

              /*
               * Calculate route if pickup
               * is already selected.
               */
              if (
                pickupLocationRef.current
              ) {
                await calculateRoute(
                  pickupLocationRef.current,
                  location
                );
              } else {
                map.panTo(location);
              }

              setError("");
            } catch (error) {
              console.error(
                "GOOGLE MAPS: Destination selection error:",
                error
              );

              setError(
                "Could not select destination."
              );
            }
          }
        );

        console.log(
          "GOOGLE MAPS: Autocomplete initialized successfully."
        );
      } catch (error) {
        console.error(
          "GOOGLE MAPS: Map initialization failed:",
          error
        );

        setMapError(
          "Google Maps could not be initialized. Check the browser console for the exact error."
        );
      }
    }

    /*
     * Calculate driving route.
     */
    async function calculateRoute(
      origin,
      destination
    ) {
      try {
        const { Route } =
          await importLibrary("routes");

        /*
         * Remove previous route.
         */
        routePolylinesRef.current.forEach(
          (polyline) => {
            polyline.setMap(null);
          }
        );

        routePolylinesRef.current = [];

        const request = {
          origin,
          destination,
          travelMode: "DRIVING",
          fields: [
            "path",
            "distanceMeters",
            "durationMillis"
          ]
        };

        console.log(
          "GOOGLE MAPS: Calculating route..."
        );

        const { routes } =
          await Route.computeRoutes(
            request
          );

        if (
          !routes ||
          routes.length === 0
        ) {
          setRouteInfo({
            distance: "",
            duration: ""
          });

          setError(
            "No driving route could be found between these locations."
          );

          return;
        }

        const route = routes[0];

        /*
         * Draw route.
         */
        const polylines =
          route.createPolylines();

        polylines.forEach(
          (polyline) => {
            polyline.setMap(
              mapRef.current
            );
          }
        );

        routePolylinesRef.current =
          polylines;

        /*
         * Distance.
         */
        let distanceText = "";

        if (
          typeof route.distanceMeters ===
          "number"
        ) {
          const kilometers =
            route.distanceMeters / 1000;

          distanceText =
            kilometers < 1
              ? `${Math.round(
                  route.distanceMeters
                )} m`
              : `${kilometers.toFixed(
                  1
                )} km`;
        }

        /*
         * Duration.
         */
        let durationText = "";

        if (
          typeof route.durationMillis ===
          "number"
        ) {
          const totalMinutes =
            Math.round(
              route.durationMillis / 60000
            );

          if (totalMinutes < 60) {
            durationText =
              `${totalMinutes} min`;
          } else {
            const hours =
              Math.floor(
                totalMinutes / 60
              );

            const minutes =
              totalMinutes % 60;

            durationText =
              minutes === 0
                ? `${hours} hr`
                : `${hours} hr ${minutes} min`;
          }
        }

        setRouteInfo({
          distance: distanceText,
          duration: durationText
        });

        /*
         * Fit map to route.
         */
        if (route.path?.length) {
          const { LatLngBounds } =
            await importLibrary("core");

          const bounds =
            new LatLngBounds();

          route.path.forEach(
            (point) => {
              bounds.extend(point);
            }
          );

          mapRef.current.fitBounds(
            bounds
          );
        }

        setError("");

        console.log(
          "GOOGLE MAPS: Route calculated successfully."
        );
      } catch (error) {
        console.error(
          "GOOGLE MAPS: Route calculation error:",
          error
        );

        setRouteInfo({
          distance: "",
          duration: ""
        });

        setError(
          "Could not calculate the driving route. Check your Google Routes API configuration."
        );
      }
    }

    initializeGoogleMaps();

    return () => {
      cancelled = true;

      /*
       * Remove markers.
       */
      if (
        pickupMarkerRef.current
      ) {
        pickupMarkerRef.current.map =
          null;

        pickupMarkerRef.current = null;
      }

      if (
        destinationMarkerRef.current
      ) {
        destinationMarkerRef.current.map =
          null;

        destinationMarkerRef.current = null;
      }

      /*
       * Remove route.
       */
      routePolylinesRef.current.forEach(
        (polyline) => {
          polyline.setMap(null);
        }
      );

      routePolylinesRef.current = [];

      /*
       * Clear autocomplete.
       */
      if (
        pickupContainerRef.current
      ) {
        pickupContainerRef.current.innerHTML =
          "";
      }

      if (
        destinationContainerRef.current
      ) {
        destinationContainerRef.current.innerHTML =
          "";
      }

      mapRef.current = null;

      mapsInitializationRef.current =
        false;
    };
  }, [mapsLoaded]);

  /*
   * Create booking.
   */
  async function submit(e) {
    e.preventDefault();

    setError("");

    /*
     * Booking date validation.
     */
    if (!form.bookingDate) {
      setError(
        "Please select a booking date and time."
      );

      return;
    }

    const selectedDate =
      new Date(form.bookingDate);

    const now = new Date();

    if (
      Number.isNaN(
        selectedDate.getTime()
      ) ||
      selectedDate < now
    ) {
      setError(
        "You cannot book a ride for a past date or time. Please select today or a future date and time."
      );

      return;
    }

    /*
     * Require locations.
     *
     * Google Maps selections are preferred because
     * they provide coordinates for routing.
     */
    if (
      !pickupLocationRef.current ||
      !destinationLocationRef.current
    ) {
      setError(
        "Please select both pickup and destination from the Google Maps suggestions."
      );

      return;
    }

    try {
      await api.post(
        "/bookings/create",
        form
      );

      /*
       * Existing booking flow remains unchanged.
       */
      navigate("/customer/bookings");
    } catch (error) {
      console.error(
        "Booking creation failed:",
        error.response?.data ||
          error.message
      );

      setError(
        error.response?.data?.message ||
          "Booking failed."
      );
    }
  }

  /*
   * Vehicle selection.
   */
  function handleVehicleChange(e) {
    const vehicleId =
      e.target.value;

    const selectedVehicle =
      vehicles.find(
        (vehicle) =>
          String(vehicle._id) ===
          String(vehicleId)
      );

    setForm((prev) => ({
      ...prev,
      vehicleId,
      vehicleType:
        selectedVehicle?.vehicleType ||
        ""
    }));
  }

  return (
    <main className="container">
      <BackButton />

      <h1>Book a Driver</h1>

      {mapError && (
        <div
          className="error"
          style={{
            marginBottom: "10px"
          }}
        >
          {mapError}
        </div>
      )}

      <form
        className="card formgrid"
        onSubmit={submit}
      >
        <select
          required
          value={form.vehicleId}
          onChange={
            handleVehicleChange
          }
        >
          <option value="">
            Select vehicle
          </option>

          {vehicles.map(
            (vehicle) => (
              <option
                key={vehicle._id}
                value={vehicle._id}
              >
                {
                  vehicle.vehicleNumber
                }{" "}
                -{" "}
                {vehicle.brand}{" "}
                {vehicle.model}
              </option>
            )
          )}
        </select>

        <select
          required
          value={form.driverId}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              driverId:
                e.target.value
            }))
          }
        >
          <option value="">
            Select driver
          </option>

          {drivers.map(
            (driver) => (
              <option
                key={driver._id}
                value={driver._id}
              >
                {
                  driver.userId?.name
                }{" "}
                ·{" "}
                {driver.ratingAverage ||
                  0}
                ★
              </option>
            )
          )}
        </select>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: "600"
            }}
          >
            Pickup Location
          </label>

          <div
            ref={
              pickupContainerRef
            }
          />

          {!mapsLoaded &&
            !mapError && (
              <small>
                Loading Google Maps...
              </small>
            )}
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: "600"
            }}
          >
            Destination
          </label>

          <div
            ref={
              destinationContainerRef
            }
          />
        </div>

        <input
          type="datetime-local"
          required
          min={getMinBookingDateTime()}
          value={
            form.bookingDate
          }
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              bookingDate:
                e.target.value
            }))
          }
        />

        <input
          type="number"
          min="1"
          max="72"
          value={form.duration}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              duration: Number(
                e.target.value
              )
            }))
          }
        />

        {routeInfo.distance && (
          <div
            className="card"
            style={{
              marginTop: "10px",
              padding: "12px"
            }}
          >
            <strong>
              Route Information
            </strong>

            <p
              style={{
                margin:
                  "8px 0 0"
              }}
            >
              Distance:{" "}
              {routeInfo.distance}
            </p>

            <p
              style={{
                margin:
                  "4px 0 0"
              }}
            >
              Estimated travel
              time:{" "}
              {
                routeInfo.duration
              }
            </p>
          </div>
        )}

        <div
          ref={mapContainerRef}
          style={{
            width: "100%",
            height: "400px",
            marginTop: "10px",
            borderRadius: "10px",
            overflow: "hidden",
            background:
              "#eeeeee"
          }}
        >
          {!mapsLoaded &&
            !mapError && (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center"
                }}
              >
                Loading map...
              </div>
            )}

          {mapError && (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                padding: "20px",
                textAlign: "center"
              }}
            >
              Google Maps is
              unavailable.
              <br />
              Check the error
              message above.
            </div>
          )}
        </div>

        <button type="submit">
          Request Driver
        </button>
      </form>

      {error && (
        <p className="error">
          {error}
        </p>
      )}
    </main>
  );
}