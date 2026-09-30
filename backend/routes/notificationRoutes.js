const router = require("express").Router();

const Notification = require("../models/Notification");

const auth = require("../middleware/authMiddleware");


// Get current user's notifications
router.get("/my", auth, async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      userId: req.user.id
    })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      notifications
    });
  } catch (e) {
    next(e);
  }
});


// Get unread notification count
router.get("/unread-count", auth, async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false
    });

    res.json({
      success: true,
      count
    });
  } catch (e) {
    next(e);
  }
});


// Mark one notification as read
router.patch("/:notificationId/read", auth, async (req, res, next) => {
  try {
    const n = await Notification.findOneAndUpdate(
      {
        _id: req.params.notificationId,
        userId: req.user.id
      },
      {
        isRead: true
      },
      {
        new: true
      }
    );

    if (!n) {
      return res.status(404).json({
        success: false,
        message: "Notification not found."
      });
    }

    // Send real-time update to the user's socket room
    const io = req.app.get("io");

    if (io) {
      const userRoom = `user:${req.user.id}`;

      io.to(userRoom).emit("notificationUpdated", {
        notificationId: n._id,
        notification: n,
        isRead: n.isRead
      });

      io.to(userRoom).emit("notificationsUpdated", {
        notificationId: n._id,
        notification: n,
        action: "read"
      });
    }

    res.json({
      success: true,
      notification: n
    });
  } catch (e) {
    next(e);
  }
});


// Mark all notifications as read
router.patch("/read-all", auth, async (req, res, next) => {
  try {
    await Notification.updateMany(
      {
        userId: req.user.id,
        isRead: false
      },
      {
        $set: {
          isRead: true
        }
      }
    );

    // Get the updated notifications
    const notifications = await Notification.find({
      userId: req.user.id
    })
      .sort({ createdAt: -1 })
      .limit(100);

    // Send real-time update to the user's socket room
    const io = req.app.get("io");

    if (io) {
      const userRoom = `user:${req.user.id}`;

      io.to(userRoom).emit("notificationsUpdated", {
        notifications,
        action: "read-all"
      });

      io.to(userRoom).emit("notificationUpdated", {
        action: "read-all",
        notifications
      });
    }

    res.json({
      success: true
    });
  } catch (e) {
    next(e);
  }
});


module.exports = router;