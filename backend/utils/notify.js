const Notification = require("../models/Notification");
const emitNotification = require("./notificationSocket");

async function notify({ userId, title, message, type, bookingId, io }) {

  try {

    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      bookingId
    });

    // Send notification in real time through Socket.IO
    emitNotification(io, notification);

    return notification;

  } catch (err) {

    console.error("Notification error:", err.message);
    return null;

  }

}

module.exports = { notify };