import React, { useEffect, useState } from "react";
import api from "../services/api";
import BackButton from "../components/BackButton";
import socket from "../services/socket";

export default function DriverProfile() {
    const [driver, setDriver] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [licenseNumber, setLicenseNumber] = useState("");
    const [experience, setExperience] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    // Load driver profile
    async function loadProfile() {
        try {
            const { data } = await api.get("/drivers/profile");

            setDriver(data.driver);
        } catch (err) {
            if (err.response?.status === 404) {
                setDriver(null);
            } else {
                setError(
                    err.response?.data?.message ||
                    "Unable to load driver profile."
                );
            }
        } finally {
            setLoading(false);
        }
    }

    // Initial profile load
    useEffect(() => {
        loadProfile();
    }, []);

    // Real-time driver availability updates
    useEffect(() => {
        function handleAvailabilityUpdated(data) {
            console.log(
                "DRIVER REAL-TIME AVAILABILITY UPDATE:",
                data
            );

            /*
             * If the backend sends the complete driver object,
             * update it directly.
             */
            if (data.driver) {
                setDriver((prevDriver) => {
                    if (!prevDriver) {
                        return prevDriver;
                    }

                    if (
                        data.driver._id &&
                        prevDriver._id &&
                        String(data.driver._id) !==
                            String(prevDriver._id)
                    ) {
                        return prevDriver;
                    }

                    return {
                        ...prevDriver,
                        ...data.driver
                    };
                });

                return;
            }

            /*
             * If only driverId and isAvailable are sent,
             * update the availability locally.
             */
            if (
                data.driverId &&
                data.isAvailable !== undefined
            ) {
                setDriver((prevDriver) => {
                    if (
                        !prevDriver ||
                        String(prevDriver._id) !==
                            String(data.driverId)
                    ) {
                        return prevDriver;
                    }

                    return {
                        ...prevDriver,
                        isAvailable: data.isAvailable
                    };
                });
            }
        }

        socket.on(
            "driverAvailabilityUpdated",
            handleAvailabilityUpdated
        );

        return () => {
            socket.off(
                "driverAvailabilityUpdated",
                handleAvailabilityUpdated
            );
        };
    }, []);

    // Submit driver application
    async function submitApplication(e) {
        e.preventDefault();

        setError("");
        setMessage("");
        setSubmitting(true);

        try {
            await api.post("/drivers/apply", {
                licenseNumber,
                experience: Number(experience)
            });

            setMessage(
                "Driver application submitted successfully. Please wait for admin approval."
            );

            setLicenseNumber("");
            setExperience("");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Failed to submit driver application."
            );
        } finally {
            setSubmitting(false);
        }
    }

    // Toggle driver availability
    async function toggle() {
        if (!driver) {
            return;
        }

        const newAvailability = !driver.isAvailable;

        setError("");

        try {
            const { data } = await api.patch(
                "/drivers/availability",
                {
                    isAvailable: newAvailability
                }
            );

            /*
             * Update immediately using the value returned
             * by the backend.
             */
            setDriver((prevDriver) => ({
                ...prevDriver,
                isAvailable:
                    data.isAvailable !== undefined
                        ? data.isAvailable
                        : newAvailability
            }));

            /*
             * The backend should also emit:
             *
             * driverAvailabilityUpdated
             *
             * which will update other connected clients,
             * such as BookDriver.jsx.
             */
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to change availability."
            );
        }
    }

    if (loading) {
        return (
            <main className="container">
                <p>Loading...</p>
            </main>
        );
    }

    if (message && !driver) {
        return (
            <main className="container">
                <BackButton />

                <h1>Driver Application</h1>

                <div className="card">
                    <p>{message}</p>

                    <p>
                        Your application is now pending admin
                        approval.
                    </p>
                </div>
            </main>
        );
    }

    if (!driver) {
        return (
            <main className="container">
                <BackButton />

                <h1>Complete Driver Profile</h1>

                <div className="card">
                    <p>
                        You are registered as a driver. Please
                        submit your driving details to apply for
                        verification.
                    </p>

                    <form onSubmit={submitApplication}>
                        <input
                            type="text"
                            placeholder="License Number"
                            value={licenseNumber}
                            onChange={(e) =>
                                setLicenseNumber(
                                    e.target.value
                                )
                            }
                            required
                        />

                        <input
                            type="number"
                            placeholder="Years of Experience"
                            value={experience}
                            onChange={(e) =>
                                setExperience(
                                    e.target.value
                                )
                            }
                            min="0"
                            max="80"
                            required
                        />

                        <button
                            type="submit"
                            disabled={submitting}
                        >
                            {submitting
                                ? "Submitting..."
                                : "Submit Application"}
                        </button>
                    </form>

                    {error && (
                        <p className="error">
                            {error}
                        </p>
                    )}
                </div>
            </main>
        );
    }

    return (
        <main className="container">
            <BackButton />

            <h1>Driver Profile</h1>

            <div className="card">
                <h2>
                    {driver.userId?.name}
                </h2>

                <p>
                    {driver.userId?.email} ·{" "}
                    {driver.userId?.phone}
                </p>

                <p>
                    License: {driver.licenseNumber}
                </p>

                <p>
                    Experience: {driver.experience} years
                </p>

                <p>
                    Rating: {driver.ratingAverage} (
                    {driver.ratingCount})
                </p>

                <p>
                    Verification:{" "}
                    <b>
                        {driver.verificationStatus}
                    </b>
                </p>

                <p>
                    Availability:{" "}
                    <b>
                        {driver.isAvailable
                            ? "Online"
                            : "Offline"}
                    </b>
                </p>

                <button onClick={toggle}>
                    {driver.isAvailable
                        ? "Go Offline"
                        : "Go Online"}
                </button>

                {error && (
                    <p className="error">
                        {error}
                    </p>
                )}
            </div>
        </main>
    );
}