const router = require("express").Router();

const User = require("../models/User");
const Driver = require("../models/Driver");
const Booking = require("../models/Booking");

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");


// =====================================================
// ADMIN DASHBOARD
// =====================================================

router.get(
  "/dashboard",
  auth,
  role("admin"),
  async (req, res, next) => {
    try {
      const [
        users,
        drivers,
        bookings,
        pendingDrivers,
        ongoingBookings
      ] = await Promise.all([
        User.countDocuments(),
        Driver.countDocuments(),
        Booking.countDocuments(),
        Driver.countDocuments({
          verificationStatus: "pending"
        }),
        Booking.countDocuments({
          status: "ongoing"
        })
      ]);

      res.json({
        success: true,
        stats: {
          users,
          drivers,
          bookings,
          pendingDrivers,
          ongoingBookings
        }
      });
    } catch (e) {
      next(e);
    }
  }
);


// =====================================================
// ALL USERS
// =====================================================

router.get(
  "/users",
  auth,
  role("admin"),
  async (req, res, next) => {
    try {
      const users = await User.find()
        .select("-password")
        .sort({ createdAt: -1 })
        .limit(500);

      res.json({
        success: true,
        users
      });
    } catch (e) {
      next(e);
    }
  }
);


// =====================================================
// ALL DRIVERS
// =====================================================

router.get(
  "/drivers",
  auth,
  role("admin"),
  async (req, res, next) => {
    try {
      const drivers = await Driver.find()
        .populate(
          "userId",
          "name email phone role driverApplicationStatus isActive"
        )
        .sort({ createdAt: -1 })
        .limit(500);

      res.json({
        success: true,
        drivers
      });
    } catch (e) {
      next(e);
    }
  }
);


// =====================================================
// ALL BOOKINGS
// =====================================================

router.get(
  "/bookings",
  auth,
  role("admin"),
  async (req, res, next) => {
    try {
      const bookings = await Booking.find()
        .populate(
          "customerId",
          "name email phone"
        )
        .populate("vehicleId")
        .populate({
          path: "driverId",
          populate: {
            path: "userId",
            select: "name phone"
          }
        })
        .sort({ createdAt: -1 })
        .limit(500);

      res.json({
        success: true,
        bookings
      });
    } catch (e) {
      next(e);
    }
  }
);


// =====================================================
// ACTIVATE / DEACTIVATE USER
// =====================================================

router.patch(
  "/users/:id/status",
  auth,
  role("admin"),
  async (req, res, next) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        {
          isActive: Boolean(req.body.isActive)
        },
        {
          new: true
        }
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found."
        });
      }

      // -------------------------------------------------
      // REAL-TIME USER STATUS UPDATE
      // -------------------------------------------------

      const io = req.app.get("io");

      if (io) {
        const userData = {
          userId: user._id,
          isActive: user.isActive
        };

        // Notify the affected user
        io.to(`user:${user._id.toString()}`).emit(
          "userStatusUpdated",
          userData
        );

        // Notify all connected admins
        io.emit(
          "adminUserStatusUpdated",
          userData
        );

        // Ask admin dashboards to refresh their data
        io.emit(
          "adminDataUpdated",
          {
            type: "userStatus",
            userId: user._id
          }
        );
      }

      res.json({
        success: true,
        user
      });
    } catch (e) {
      next(e);
    }
  }
);


module.exports = router;