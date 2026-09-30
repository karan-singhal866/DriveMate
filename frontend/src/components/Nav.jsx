import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import socket from "../services/socket";

export default function Nav() {
    const { user, logout } = useAuth();

    const [unreadCount, setUnreadCount] = useState(0);
    const [popup, setPopup] = useState(null);

    const dismissedNotificationId = useRef(null);
    const shownNotificationId = useRef(null);

    useEffect(() => {
        if (!user || user.role === "admin") {
            setUnreadCount(0);
            return;
        }

        async function loadUnreadNotifications() {
            try {
                const { data } = await api.get(
                    "/notifications/unread-count"
                );

                setUnreadCount(data.count || 0);
            } catch (err) {
                console.log(
                    "Failed to load unread notification count"
                );
            }
        }

        loadUnreadNotifications();

        function handleNotificationsUpdated(data) {
            if (
                data &&
                typeof data.unreadCount === "number"
            ) {
                setUnreadCount(data.unreadCount);
                return;
            }

            loadUnreadNotifications();
        }

        function handleNotificationUpdated(data) {
            if (data?.notification) {
                loadUnreadNotifications();
            } else {
                loadUnreadNotifications();
            }
        }

        function handleNewNotification(notification) {
            if (!notification) return;

            console.log(
                "REAL-TIME NOTIFICATION:",
                notification
            );

            setUnreadCount(prev => prev + 1);

            if (
                notification._id !==
                    dismissedNotificationId.current &&
                notification._id !==
                    shownNotificationId.current
            ) {
                shownNotificationId.current =
                    notification._id;

                setPopup({
                    id: notification._id,
                    title: notification.title,
                    message: notification.message
                });
            }
        }

        function handleNotificationCreated(data) {
            const notification =
                data?.notification || data;

            handleNewNotification(notification);
        }

        socket.on(
            "notificationsUpdated",
            handleNotificationsUpdated
        );

        socket.on(
            "notificationUpdated",
            handleNotificationUpdated
        );

        socket.on(
            "notificationCreated",
            handleNotificationCreated
        );

        socket.on(
            "newNotification",
            handleNewNotification
        );

        return () => {
            socket.off(
                "notificationsUpdated",
                handleNotificationsUpdated
            );

            socket.off(
                "notificationUpdated",
                handleNotificationUpdated
            );

            socket.off(
                "notificationCreated",
                handleNotificationCreated
            );

            socket.off(
                "newNotification",
                handleNewNotification
            );
        };
    }, [user]);

    useEffect(() => {
        if (!popup) return;

        const timer = setTimeout(() => {
            setPopup(null);
        }, 5000);

        return () => clearTimeout(timer);
    }, [popup]);

    if (!user) return null;

    return (
        <>
            <nav className="nav">
                <Link className="brand" to="/">
                    DriveMate 🚗
                </Link>

                <div className="navlinks">
                    <Link
                        to={
                            user.role === "customer"
                                ? "/customer"
                                : user.role === "driver"
                                ? "/driver"
                                : "/admin"
                        }
                    >
                        Dashboard
                    </Link>

                    {user.role === "customer" && (
                        <>
                            <Link to="/customer/vehicles">
                                Vehicles
                            </Link>

                            <Link to="/customer/book">
                                Book
                            </Link>

                            <Link to="/customer/bookings">
                                Bookings
                            </Link>
                        </>
                    )}

                    {user.role === "driver" && (
                        <Link to="/driver/bookings">
                            Bookings
                        </Link>
                    )}

                    {user.role !== "admin" && (
                        <Link
                            to="/notifications"
                            className="notification-link"
                        >
                            Notifications

                            {unreadCount > 0 && (
                                <span className="notification-badge">
                                    {unreadCount}
                                </span>
                            )}
                        </Link>
                    )}

                    <button onClick={logout}>
                        Logout
                    </button>
                </div>
            </nav>

            {popup && (
                <div className="notification-popup">
                    <div>
                        <strong>
                            {popup.title}
                        </strong>

                        <p>
                            {popup.message}
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            dismissedNotificationId.current =
                                popup.id;

                            setPopup(null);
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}
        </>
    );
}