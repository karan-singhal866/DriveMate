import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import socket from "../services/socket";

export default function CustomerDashboard() {
  const [unreadCount, setUnreadCount] = useState(0);

  // Load unread notification count
  const loadUnreadCount = async () => {
    try {
      const response = await api.get("/notifications/my");

      const notifications = response.data.notifications || [];

      setUnreadCount(
        notifications.filter((notification) => !notification.isRead)
          .length
      );
    } catch (error) {
      console.error(
        "Failed to load notification count:",
        error.response?.data || error.message
      );
    }
  };

  // Initial notification count
  useEffect(() => {
    loadUnreadCount();
  }, []);

  // Real-time notification updates
  useEffect(() => {
    const handleNotificationUpdate = (data) => {
      console.log(
        "CUSTOMER DASHBOARD REAL-TIME NOTIFICATION:",
        data
      );

      /*
        Reload the count whenever a notification is created,
        updated, or marked as read.
      */
      loadUnreadCount();
    };

    socket.on(
      "notificationUpdated",
      handleNotificationUpdate
    );

    socket.on(
      "notificationCreated",
      handleNotificationUpdate
    );

    socket.on(
      "notificationsUpdated",
      handleNotificationUpdate
    );

    return () => {
      socket.off(
        "notificationUpdated",
        handleNotificationUpdate
      );

      socket.off(
        "notificationCreated",
        handleNotificationUpdate
      );

      socket.off(
        "notificationsUpdated",
        handleNotificationUpdate
      );
    };
  }, []);

  return (
    <main className="container">
      <h1>Customer Dashboard</h1>

      <div className="grid">
        <Link
          className="tile"
          to="/customer/vehicles"
        >
          My Vehicles
        </Link>

        <Link
          className="tile"
          to="/customer/book"
        >
          Book a Driver
        </Link>

        <Link
          className="tile"
          to="/customer/bookings"
        >
          My Bookings
        </Link>

        <Link
          className="tile"
          to="/notifications"
        >
          Notifications

          {unreadCount > 0 && (
            <span className="notification-count">
              {unreadCount}
            </span>
          )}
        </Link>
      </div>
    </main>
  );
}