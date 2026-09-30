import React, { useEffect, useState } from "react";
import api from "../services/api";
import BackButton from "../components/BackButton";
import socket from "../services/socket";

export default function Notifications() {
  const [items, setItems] = useState([]);

  // Load notifications
  const load = async () => {
    try {
      const response = await api.get("/notifications/my");

      setItems(response.data.notifications || []);
    } catch (error) {
      console.error(
        "Failed to load notifications:",
        error.response?.data || error.message
      );
    }
  };

  // Initial load
  useEffect(() => {
    load();
  }, []);

  // Real-time notification updates
  useEffect(() => {
    const handleNotificationUpdated = (data) => {
      console.log("REAL-TIME NOTIFICATION UPDATE:", data);

      /*
        If a new notification is created, reload the
        notification list so the complete notification
        object is received from the backend.
      */
      if (
        data.action === "created" ||
        data.action === "new" ||
        data.notification
      ) {
        load();
        return;
      }

      /*
        If a notification was marked as read, update it
        immediately without refreshing the page.
      */
      if (data.notificationId) {
        setItems((prevItems) =>
          prevItems.map((notification) =>
            String(notification._id) === String(data.notificationId)
              ? {
                  ...notification,
                  ...(data.isRead !== undefined && {
                    isRead: data.isRead,
                  }),
                }
              : notification
          )
        );
      }

      /*
        If backend sends an updated notification object,
        replace that notification locally.
      */
      if (data.notification?._id) {
        setItems((prevItems) =>
          prevItems.map((notification) =>
            String(notification._id) ===
            String(data.notification._id)
              ? data.notification
              : notification
          )
        );
      }

      /*
        If backend tells us that all notifications were
        marked as read, update the complete list locally.
      */
      if (
        data.action === "read-all" ||
        data.action === "all-read"
      ) {
        setItems((prevItems) =>
          prevItems.map((notification) => ({
            ...notification,
            isRead: true,
          }))
        );
      }
    };

    // Listen for notification events
    socket.on(
      "notificationUpdated",
      handleNotificationUpdated
    );

    socket.on(
      "notificationCreated",
      handleNotificationUpdated
    );

    socket.on(
      "notificationsUpdated",
      handleNotificationUpdated
    );

    return () => {
      socket.off(
        "notificationUpdated",
        handleNotificationUpdated
      );

      socket.off(
        "notificationCreated",
        handleNotificationUpdated
      );

      socket.off(
        "notificationsUpdated",
        handleNotificationUpdated
      );
    };
  }, []);

  // Mark one notification as read
  async function read(id) {
    try {
      await api.patch(`/notifications/${id}/read`);

      /*
        Optimistically update the notification.
        The Socket.IO event will also keep other
        connected screens synchronized.
      */
      setItems((prevItems) =>
        prevItems.map((notification) =>
          String(notification._id) === String(id)
            ? {
                ...notification,
                isRead: true,
              }
            : notification
        )
      );
    } catch (error) {
      console.error(
        "Failed to mark notification as read:",
        error.response?.data || error.message
      );
    }
  }

  // Mark all notifications as read
  async function all() {
    try {
      await api.patch("/notifications/read-all");

      /*
        Update the UI immediately without another API
        request or page refresh.
      */
      setItems((prevItems) =>
        prevItems.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );
    } catch (error) {
      console.error(
        "Failed to mark all notifications as read:",
        error.response?.data || error.message
      );
    }
  }

  return (
    <main className="container">
      <BackButton />

      <div className="row">
        <h1>Notifications</h1>

        <button onClick={all}>
          Mark all read
        </button>
      </div>

      {items.length === 0 && (
        <p>No notifications.</p>
      )}

      {items.map((n) => (
        <div
          className={`card ${n.isRead ? "" : "unread"}`}
          key={n._id}
        >
          <b>{n.title}</b>

          <p>{n.message}</p>

          {!n.isRead && (
            <button onClick={() => read(n._id)}>
              Mark read
            </button>
          )}
        </div>
      ))}
    </main>
  );
}