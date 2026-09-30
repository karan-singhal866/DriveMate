import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import socket from "../services/socket";
import BackButton from "../components/BackButton";

export default function AdminDrivers() {
    const [searchParams] = useSearchParams();
    const status = searchParams.get("status");

    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadDrivers() {
        try {
            const { data } = await api.get("/admin/drivers");

            setDrivers(data.drivers);
            setError("");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Failed to load drivers."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadDrivers();

        // Driver availability changed
        function handleDriverAvailabilityUpdated(data) {
            if (!data?.driverId) {
                loadDrivers();
                return;
            }

            setDrivers(prevDrivers =>
                prevDrivers.map(driver =>
                    driver._id?.toString() ===
                    data.driverId?.toString()
                        ? {
                            ...driver,
                            isAvailable: data.isAvailable
                        }
                        : driver
                )
            );
        }

        // Driver application approved/rejected
        function handleDriverApplicationUpdated() {
            loadDrivers();
        }

        // General admin data changed
        function handleAdminDataUpdated() {
            loadDrivers();
        }

        socket.on(
            "driverAvailabilityUpdated",
            handleDriverAvailabilityUpdated
        );

        socket.on(
            "driverApplicationUpdated",
            handleDriverApplicationUpdated
        );

        socket.on(
            "adminDataUpdated",
            handleAdminDataUpdated
        );

        return () => {
            socket.off(
                "driverAvailabilityUpdated",
                handleDriverAvailabilityUpdated
            );

            socket.off(
                "driverApplicationUpdated",
                handleDriverApplicationUpdated
            );

            socket.off(
                "adminDataUpdated",
                handleAdminDataUpdated
            );
        };
    }, []);

    const filteredDrivers =
        status === "pending"
            ? drivers.filter(
                driver =>
                    driver.verificationStatus === "pending"
            )
            : drivers;

    if (loading) {
        return (
            <main className="container">
                <BackButton />

                <h1>All Drivers</h1>

                <p>Loading...</p>
            </main>
        );
    }

    return (
        <main className="container">
            <BackButton />

            <h1>
                {status === "pending"
                    ? "Pending Drivers"
                    : "All Drivers"}
            </h1>

            {error && (
                <p className="error">
                    {error}
                </p>
            )}

            {filteredDrivers.length === 0 ? (
                <div className="card">
                    <p>
                        No driver profiles found.
                    </p>
                </div>
            ) : (
                filteredDrivers.map(driver => (
                    <div
                        className="card"
                        key={driver._id}
                    >
                        <h3>
                            {driver.userId?.name}
                        </h3>

                        <p>
                            Email:{" "}
                            {driver.userId?.email}
                        </p>

                        <p>
                            Phone:{" "}
                            {driver.userId?.phone}
                        </p>

                        <p>
                            License:{" "}
                            {driver.licenseNumber}
                        </p>

                        <p>
                            Experience:{" "}
                            {driver.experience} years
                        </p>

                        <p>
                            Verification:{" "}
                            {driver.verificationStatus}
                        </p>

                        <p>
                            Availability:{" "}
                            {driver.isAvailable
                                ? "Online"
                                : "Offline"}
                        </p>

                        <p>
                            Rating:{" "}
                            {driver.ratingAverage} (
                            {driver.ratingCount} reviews)
                        </p>
                    </div>
                ))
            )}
        </main>
    );
}