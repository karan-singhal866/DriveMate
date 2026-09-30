import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import socket from "../services/socket";

export default function DriverDashboard() {
  const [pendingCount, setPendingCount] = useState(0);

  // Load pending booking count
  const loadPendingCount = async () => {
    try {
      const response = await api.get("/bookings/driver");

      const bookings = response.data.bookings || [];

      const pending = bookings.filter(
        (booking) => booking.status === "pending"
      );

      setPendingCount(pending.length);
    } catch (error) {
      console.error(
        "Failed to load pending booking count:",
        error.response?.data || error.message
      );
    }
  };

  // Initial load
  useEffect(() => {
    loadPendingCount();
  }, []);

  // Real-time booking updates
  useEffect(() => {
    const handleBookingUpdated = (data) => {
      console.log(
        "DRIVER DASHBOARD REAL-TIME BOOKING UPDATE:",
        data
      );

      /*
        Reload the pending count whenever a booking is
        created, accepted, rejected, started, completed,
        or otherwise updated.
      */
      loadPendingCount();
    };

    socket.on(
      "bookingUpdated",
      handleBookingUpdated
    );

    return () => {
      socket.off(
        "bookingUpdated",
        handleBookingUpdated
      );
    };
  }, []);

  return (
    <main className="container">
      <h1>Driver Dashboard</h1>

      <div className="grid">
        <Link
          className="tile"
          to="/driver/bookings"
        >
          Booking Requests

          {pendingCount > 0 && (
            <span className="notification-count">
              {pendingCount}
            </span>
          )}
        </Link>

        <Link
          className="tile"
          to="/driver/profile"
        >
          Profile & Availability
        </Link>
      </div>
    </main>
  );
}