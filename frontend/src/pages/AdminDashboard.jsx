import React, { useEffect, useState } from "react";
import api from "../services/api";
import socket from "../services/socket";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
    const navigate = useNavigate();

    const [stats, setStats] = useState(null);
    const [applications, setApplications] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadDashboard() {
        try {
            const [statsRes, applicationsRes] =
                await Promise.all([
                    api.get("/admin/dashboard"),
                    api.get("/drivers/applications")
                ]);

            setStats(statsRes.data.stats);
            setApplications(applicationsRes.data.applications);

            setError("");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Failed to load admin dashboard."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadDashboard();

        function handleAdminDataUpdated() {
            loadDashboard();
        }

        function handleDriverApplicationUpdated() {
            loadDashboard();
        }

        socket.on(
            "adminDataUpdated",
            handleAdminDataUpdated
        );

        socket.on(
            "driverApplicationUpdated",
            handleDriverApplicationUpdated
        );

        return () => {
            socket.off(
                "adminDataUpdated",
                handleAdminDataUpdated
            );

            socket.off(
                "driverApplicationUpdated",
                handleDriverApplicationUpdated
            );
        };
    }, []);

    async function approveApplication(userId) {
        try {
            await api.patch(
                `/drivers/applications/${userId}/approve`
            );

            await loadDashboard();

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Failed to approve application."
            );
        }
    }

    async function rejectApplication(userId) {
        try {
            await api.patch(
                `/drivers/applications/${userId}/reject`
            );

            await loadDashboard();

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Failed to reject application."
            );
        }
    }

    if (loading) {
        return (
            <main className="container">
                <h1>Admin Dashboard</h1>
                <p>Loading...</p>
            </main>
        );
    }

    return (
        <main className="container">

            <h1>Admin Dashboard</h1>

            {error && (
                <p className="error">
                    {error}
                </p>
            )}

            {/* ================= STATISTICS ================= */}

            {stats && (
                <>
                    <h2>Statistics</h2>

                    <div className="grid">

                        {/* USERS */}

                        <button
                            className="tile"
                            onClick={() => {
                                console.log("CLICKED USERS");
                                navigate("/admin/users");
                            }}
                        >
                            <b>{stats.users}</b>
                            <span>Users</span>
                        </button>


                        {/* DRIVERS */}

                        <button
                            className="tile"
                            onClick={() =>
                                navigate("/admin/drivers")
                            }
                        >
                            <b>{stats.drivers}</b>
                            <span>Drivers</span>
                        </button>


                        {/* BOOKINGS */}

                        <button
                            className="tile"
                            onClick={() =>
                                navigate("/admin/bookings")
                            }
                        >
                            <b>{stats.bookings}</b>
                            <span>Bookings</span>
                        </button>


                        {/* PENDING DRIVERS */}

                        <button
                            className="tile"
                            onClick={() =>
                                navigate(
                                    "/admin/drivers?status=pending"
                                )
                            }
                        >
                            <b>{stats.pendingDrivers}</b>
                            <span>Pending Drivers</span>
                        </button>


                        {/* ONGOING BOOKINGS */}

                        <button
                            className="tile"
                            onClick={() =>
                                navigate(
                                    "/admin/bookings?status=ongoing"
                                )
                            }
                        >
                            <b>{stats.ongoingBookings}</b>
                            <span>Ongoing Bookings</span>
                        </button>

                    </div>
                </>
            )}


            {/* ================= DRIVER APPLICATIONS ================= */}

            <h2>
                Pending Driver Applications
            </h2>

            {applications.length === 0 ? (

                <div className="card">
                    <p>
                        No pending driver applications.
                    </p>
                </div>

            ) : (

                applications.map(application => (

                    <div
                        className="card"
                        key={application._id}
                    >

                        <h3>
                            {application.userId?.name}
                        </h3>

                        <p>
                            <b>Email:</b>{" "}
                            {application.userId?.email}
                        </p>

                        <p>
                            <b>Phone:</b>{" "}
                            {application.userId?.phone}
                        </p>

                        <p>
                            <b>License:</b>{" "}
                            {application.licenseNumber}
                        </p>

                        <p>
                            <b>Experience:</b>{" "}
                            {application.experience} years
                        </p>

                        <p>
                            <b>Status:</b>{" "}
                            {application.verificationStatus}
                        </p>


                        <div className="actions">

                            <button
                                onClick={() =>
                                    approveApplication(
                                        application.userId._id
                                    )
                                }
                            >
                                Approve
                            </button>


                            <button
                                onClick={() =>
                                    rejectApplication(
                                        application.userId._id
                                    )
                                }
                            >
                                Reject
                            </button>

                        </div>

                    </div>

                ))

            )}

        </main>
    );
}