import React, { useEffect, useState } from "react";
import api from "../services/api";
import socket from "../services/socket";
import BackButton from "../components/BackButton";

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadUsers() {
        try {
            const { data } = await api.get("/admin/users");

            setUsers(data.users);
            setError("");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Failed to load users."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadUsers();

        function handleUserStatusUpdated(data) {
            if (!data?.userId) {
                loadUsers();
                return;
            }

            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user._id?.toString() ===
                    data.userId?.toString()
                        ? {
                            ...user,
                            isActive: data.isActive
                        }
                        : user
                )
            );
        }

        function handleAdminDataUpdated() {
            loadUsers();
        }

        socket.on(
            "userStatusUpdated",
            handleUserStatusUpdated
        );

        socket.on(
            "adminDataUpdated",
            handleAdminDataUpdated
        );

        return () => {
            socket.off(
                "userStatusUpdated",
                handleUserStatusUpdated
            );

            socket.off(
                "adminDataUpdated",
                handleAdminDataUpdated
            );
        };
    }, []);

    if (loading) {
        return (
            <main className="container">
                <BackButton />

                <h1>All Users</h1>

                <p>Loading...</p>
            </main>
        );
    }

    return (
        <main className="container">
            <BackButton />

            <h1>All Users</h1>

            {error && (
                <p className="error">
                    {error}
                </p>
            )}

            {users.length === 0 ? (
                <div className="card">
                    <p>No users found.</p>
                </div>
            ) : (
                users.map(user => (
                    <div
                        className="card"
                        key={user._id}
                    >
                        <h3>
                            {user.name}
                        </h3>

                        <p>
                            <b>Email:</b>{" "}
                            {user.email}
                        </p>

                        <p>
                            <b>Phone:</b>{" "}
                            {user.phone}
                        </p>

                        <p>
                            <b>Role:</b>{" "}
                            {user.role}
                        </p>

                        <p>
                            <b>Account:</b>{" "}
                            {user.isActive
                                ? "Active"
                                : "Inactive"}
                        </p>

                        <p>
                            <b>Driver Application:</b>{" "}
                            {user.driverApplicationStatus}
                        </p>
                    </div>
                ))
            )}
        </main>
    );
}