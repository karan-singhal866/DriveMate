import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import BackButton from "../components/BackButton";
import socket from "../services/socket";

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
    vehicleType: "",
  });
  const [error, setError] = useState("");

  const navigate = useNavigate();

  /*
   * Get the current local date and time in the format
   * required by <input type="datetime-local">.
   *
   * Example:
   * 2026-09-30T19:30
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

  // Load vehicles and available drivers
  const loadData = async () => {
    try {
      const [vehiclesResponse, driversResponse] =
        await Promise.all([
          api.get("/vehicles/my"),
          api.get("/drivers/available"),
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

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Real-time driver availability updates
  useEffect(() => {
    const handleDriverAvailabilityUpdated = (
      data
    ) => {
      console.log(
        "REAL-TIME DRIVER AVAILABILITY UPDATE:",
        data
      );

      /*
       * Availability may change when a driver:
       * - becomes available
       * - becomes unavailable
       * - accepts a booking
       * - completes a trip
       */
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

  // Create booking
  async function submit(e) {
    e.preventDefault();

    setError("");

    /*
     * Extra frontend validation.
     *
     * This prevents a previous date/time from being
     * submitted even if the browser somehow contains
     * an old value.
     */
    if (!form.bookingDate) {
      setError(
        "Please select a booking date and time."
      );
      return;
    }

    const selectedDate = new Date(
      form.bookingDate
    );

    const now = new Date();

    if (
      Number.isNaN(selectedDate.getTime()) ||
      selectedDate < now
    ) {
      setError(
        "You cannot book a ride for a past date or time. Please select today or a future date and time."
      );
      return;
    }

    try {
      await api.post(
        "/bookings/create",
        form
      );

      /*
       * The backend will emit the bookingUpdated
       * Socket.IO event. The customer and driver
       * booking pages will update automatically.
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

  // Vehicle selection
  function handleVehicleChange(e) {
    const vehicleId = e.target.value;

    const selectedVehicle = vehicles.find(
      (vehicle) =>
        String(vehicle._id) ===
        String(vehicleId)
    );

    setForm((prev) => ({
      ...prev,
      vehicleId,
      vehicleType:
        selectedVehicle?.vehicleType || "",
    }));
  }

  return (
    <main className="container">
      <BackButton />

      <h1>Book a Driver</h1>

      <form
        className="card formgrid"
        onSubmit={submit}
      >
        <select
          required
          value={form.vehicleId}
          onChange={handleVehicleChange}
        >
          <option value="">
            Select vehicle
          </option>

          {vehicles.map((vehicle) => (
            <option
              key={vehicle._id}
              value={vehicle._id}
            >
              {vehicle.vehicleNumber} -{" "}
              {vehicle.brand}{" "}
              {vehicle.model}
            </option>
          ))}
        </select>

        <select
          required
          value={form.driverId}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              driverId: e.target.value,
            }))
          }
        >
          <option value="">
            Select driver
          </option>

          {drivers.map((driver) => (
            <option
              key={driver._id}
              value={driver._id}
            >
              {driver.userId?.name} ·{" "}
              {driver.ratingAverage || 0}★
            </option>
          ))}
        </select>

        <input
          placeholder="Pickup location"
          required
          value={form.pickupLocation}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              pickupLocation:
                e.target.value,
            }))
          }
        />

        <input
          placeholder="Destination"
          required
          value={form.destination}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              destination:
                e.target.value,
            }))
          }
        />

        <input
          type="datetime-local"
          required
          min={getMinBookingDateTime()}
          value={form.bookingDate}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              bookingDate: e.target.value,
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
              ),
            }))
          }
        />

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