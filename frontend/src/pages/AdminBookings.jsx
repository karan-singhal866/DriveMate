import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import BackButton from "../components/BackButton";

export default function AdminBookings() {
    const [searchParams] = useSearchParams();
    const status = searchParams.get("status");
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadBookings() {
            try {
                const { data } = await api.get("/admin/bookings");
                setBookings(data.bookings);
            } catch (err) {
                setError(
                    err.response?.data?.message ||
                    "Failed to load bookings."
                );
            } finally {
                setLoading(false);
            }
        }

        loadBookings();
    }, []);

    if (loading) {
        return (
            <main className="container">
                <h1>All Bookings</h1>
                <p>Loading...</p>
            </main>
        );
    }

    return (
        <main className="container">
            <BackButton />
            <h1>
                {status === "ongoing" ? "Ongoing Bookings" : "All Bookings"}
            </h1>

            {error && (
                <p className="error">
                    {error}
                </p>
            )}

            {(status === "ongoing"
                ? bookings.filter(booking => booking.status === "ongoing")
                : bookings
            ).length === 0 ? (
                <div className="card">
                    <p>No bookings found.</p>
                </div>
            ) : (
                (status === "ongoing"
                    ? bookings.filter(booking => booking.status === "ongoing")
                    : bookings
                ).map(booking => (
                    <div className="card" key={booking._id}>

                        <h3>
                            Booking ID: {booking._id}
                        </h3>

                        <p>
                            <b>Customer:</b>{" "}
                            {booking.customerId?.name || "N/A"}
                        </p>

                        <p>
                            <b>Customer Email:</b>{" "}
                            {booking.customerId?.email || "N/A"}
                        </p>

                        <p>
                            <b>Customer Phone:</b>{" "}
                            {booking.customerId?.phone || "N/A"}
                        </p>

                        <p>
                            <b>Driver:</b>{" "}
                            {booking.driverId?.userId?.name ||
                                "Not assigned"}
                        </p>

                        <p>
                            <b>Pickup:</b>{" "}
                            {booking.pickupLocation}
                        </p>

                        <p>
                            <b>Destination:</b>{" "}
                            {booking.destination}
                        </p>

                        <p>
                            <b>Booking Date:</b>{" "}
                            {new Date(
                                booking.bookingDate
                            ).toLocaleString()}
                        </p>

                        <p>
                            <b>Duration:</b>{" "}
                            {booking.duration} hour(s)
                        </p>

                        <p>
                            <b>Vehicle Type:</b>{" "}
                            {booking.vehicleType}
                        </p>

                        <p>
                            <b>Status:</b>{" "}
                            {booking.status}
                        </p>

                        <p>
                            <b>Estimated Fare:</b>{" "}
                            ₹{booking.estimatedFare}
                        </p>

                        <p>
                            <b>Payment Status:</b>{" "}
                            {booking.paymentStatus}
                        </p>

                        {booking.createdAt && (
                            <p>
                                <b>Created:</b>{" "}
                                {new Date(
                                    booking.createdAt
                                ).toLocaleString()}
                            </p>
                        )}

                    </div>
                ))
            )}
        </main>
    );
}