
function emitNotification(io, notification) {
  if (!io || !notification || !notification.userId) {
    return;
  }

  const userRoom = `user:${notification.userId.toString()}`;

  const eventData = {
    notification
  };

  /*
  |--------------------------------------------------------------------------
  | NEW NOTIFICATION
  |--------------------------------------------------------------------------
  |
  | Sent when a new notification is created.
  |
  */

  io.to(userRoom).emit(
    "notificationCreated",
    eventData
  );

  /*
  |--------------------------------------------------------------------------
  | BACKWARD COMPATIBILITY
  |--------------------------------------------------------------------------
  |
  | Keep the old event as well so any existing frontend code
  | listening for "newNotification" does not break.
  |
  */

  io.to(userRoom).emit(
    "newNotification",
    notification
  );

  /*
  |--------------------------------------------------------------------------
  | NOTIFICATION LIST UPDATE
  |--------------------------------------------------------------------------
  |
  | Tells the frontend that the user's notification list
  | has changed and should be refreshed.
  |
  */

  io.to(userRoom).emit(
    "notificationsUpdated",
    {
      notificationId: notification._id,
      notification
    }
  );
}

module.exports = emitNotification;
