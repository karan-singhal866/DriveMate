const router = require("express").Router();
const bcrypt = require("bcrypt");

const Booking = require("../models/Booking");
const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const { generateOtp } = require("../utils/otp");
const { notify } = require("../utils/notify");

/*
|--------------------------------------------------------------------------
| REAL-TIME HELPERS
|--------------------------------------------------------------------------
*/

function getIO(req) {
  return req.app.get("io");
}

function emitToUser(io, userId, event, data) {
  if (!io || !userId) return;

  io.to(`user:${userId.toString()}`).emit(event, data);
}

function emitToBooking(io, bookingId, event, data) {
  if (!io || !bookingId) return;

  io.to(`booking:${bookingId.toString()}`).emit(event, data);
}

function emitBookingUpdate(req, booking, extra = {}) {
  const io = getIO(req);

  if (!io || !booking) return;

  const data = {
    bookingId: booking._id,
    status: booking.status,
    booking,
    ...extra
  };

  emitToBooking(
    io,
    booking._id,
    "bookingUpdated",
    data
  );

  if (booking.customerId) {
    emitToUser(
      io,
      booking.customerId,
      "bookingUpdated",
      data
    );
  }

  if (booking.driverId?.userId) {
    emitToUser(
      io,
      booking.driverId.userId,
      "bookingUpdated",
      data
    );
  }
}

/*
|--------------------------------------------------------------------------
| CREATE BOOKING
|--------------------------------------------------------------------------
*/

router.post(
  "/create",
  auth,
  role("customer"),
  async (req, res, next) => {
    try {
      const {
        vehicleId,
        driverId,
        pickupLocation,
        destination,
        bookingDate,
        duration,
        vehicleType
      } = req.body;

      if (
        !vehicleId ||
        !driverId ||
        !pickupLocation ||
        !destination ||
        !bookingDate ||
        !duration ||
        !vehicleType
      ) {
        return res.status(400).json({
          success: false,
          message: "All booking fields are required."
        });
      }

      /*
      |--------------------------------------------------------------------------
      | VALIDATE BOOKING DATE
      |--------------------------------------------------------------------------
      */

      const requestedDate = new Date(bookingDate);

      if (Number.isNaN(requestedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking date."
        });
      }

      /*
       * A booking cannot be created for a date/time
       * that has already passed.
       */
      if (requestedDate < new Date()) {
        return res.status(400).json({
          success: false,
          message:
            "Booking date and time cannot be in the past."
        });
      }

      /*
      |--------------------------------------------------------------------------
      | FIND VEHICLE
      |--------------------------------------------------------------------------
      */

      const vehicle = await Vehicle.findOne({
        _id: vehicleId,
        ownerId: req.user.id
      });

      /*
      |--------------------------------------------------------------------------
      | FIND AVAILABLE DRIVER
      |--------------------------------------------------------------------------
      */

      const driver = await Driver.findOne({
        _id: driverId,
        verificationStatus: "verified",
        isAvailable: true
      });

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: "Vehicle not found."
        });
      }

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver is unavailable."
        });
      }

      /*
      |--------------------------------------------------------------------------
      | CREATE BOOKING
      |--------------------------------------------------------------------------
      */

      const booking = await Booking.create({
        customerId: req.user.id,
        vehicleId,
        driverId,
        pickupLocation,
        destination,
        bookingDate: requestedDate,
        duration,
        vehicleType
      });

      /*
      |--------------------------------------------------------------------------
      | NOTIFY DRIVER
      |--------------------------------------------------------------------------
      */

      await notify({
        userId: driver.userId,
        title: "New booking",
        message: "You have a new booking request.",
        type: "booking_created",
        bookingId: booking._id,
        io: getIO(req)
      });

      /*
      |--------------------------------------------------------------------------
      | REAL-TIME DRIVER UPDATE
      |--------------------------------------------------------------------------
      */

      const io = getIO(req);

      emitToUser(
        io,
        driver.userId,
        "bookingCreated",
        {
          bookingId: booking._id,
          status: booking.status,
          booking
        }
      );

      emitToUser(
        io,
        driver.userId,
        "bookingUpdated",
        {
          bookingId: booking._id,
          status: booking.status,
          booking
        }
      );

      /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

      res.status(201).json({
        success: true,
        booking
      });
    } catch (e) {
      next(e);
    }
  }
);



/*
|--------------------------------------------------------------------------
| CUSTOMER BOOKINGS
|--------------------------------------------------------------------------
*/

router.get(
  "/my",
  auth,
  role("customer"),
  async (req, res, next) => {
    try {
      const bookings = await Booking.find({
        customerId: req.user.id
      })
        .populate("vehicleId")
        .populate({
          path: "driverId",
          populate: {
            path: "userId",
            select: "name phone"
          }
        })
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        bookings
      });
    } catch (e) {
      next(e);
    }
  }
);

/*
|--------------------------------------------------------------------------
| DRIVER BOOKINGS
|--------------------------------------------------------------------------
*/

router.get(
  "/driver",
  auth,
  role("driver"),
  async (req, res, next) => {
    try {
      const driver = await Driver.findOne({
        userId: req.user.id
      });

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found."
        });
      }

      const bookings = await Booking.find({
        driverId: driver._id
      })
        .populate("customerId", "name phone email")
        .populate("vehicleId")
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        bookings
      });
    } catch (e) {
      next(e);
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET DRIVER BOOKING
|--------------------------------------------------------------------------
*/

async function getDriverBooking(req) {
  const driver = await Driver.findOne({
    userId: req.user.id
  });

  if (!driver) return null;

  return Booking.findOne({
    _id: req.params.bookingId,
    driverId: driver._id
  });
}

/*
|--------------------------------------------------------------------------
| ACCEPT BOOKING
|--------------------------------------------------------------------------
*/

router.patch(
  "/:bookingId/accept",
  auth,
  role("driver"),
  async (req, res, next) => {
    try {
      const booking = await getDriverBooking(req);

      if (!booking || booking.status !== "pending") {
        return res.status(404).json({
          success: false,
          message: "Pending booking not found."
        });
      }

      booking.status = "accepted";

      await booking.save();

      const driver = await Driver.findById(
        booking.driverId
      );

      await notify({
        userId: booking.customerId,
        title: "Booking accepted",
        message: "Your driver accepted the booking.",
        type: "booking_accepted",
        bookingId: booking._id,
        io: getIO(req)
      });

      const io = getIO(req);

      emitToUser(
        io,
        booking.customerId,
        "bookingUpdated",
        {
          bookingId: booking._id,
          status: "accepted",
          booking
        }
      );

      if (driver?.userId) {
        emitToUser(
          io,
          driver.userId,
          "bookingUpdated",
          {
            bookingId: booking._id,
            status: "accepted",
            booking
          }
        );
      }

      emitToBooking(
        io,
        booking._id,
        "bookingUpdated",
        {
          bookingId: booking._id,
          status: "accepted",
          booking
        }
      );

      res.json({
        success: true,
        booking
      });
    } catch (e) {
      next(e);
    }
  }
);

/*
|--------------------------------------------------------------------------
| REJECT BOOKING
|--------------------------------------------------------------------------
*/

router.patch(
  "/:bookingId/reject",
  auth,
  role("driver"),
  async (req, res, next) => {
    try {
      const booking = await getDriverBooking(req);

      if (!booking || booking.status !== "pending") {
        return res.status(404).json({
          success: false,
          message: "Pending booking not found."
        });
      }

      booking.status = "rejected";

      await booking.save();

      const driver = await Driver.findById(
        booking.driverId
      );

      await notify({
        userId: booking.customerId,
        title: "Booking rejected",
        message: "Your driver rejected the booking.",
        type: "booking_rejected",
        bookingId: booking._id,
        io: getIO(req)
      });

      const io = getIO(req);

      emitToUser(
        io,
        booking.customerId,
        "bookingUpdated",
        {
          bookingId: booking._id,
          status: "rejected",
          booking
        }
      );

      if (driver?.userId) {
        emitToUser(
          io,
          driver.userId,
          "bookingUpdated",
          {
            bookingId: booking._id,
            status: "rejected",
            booking
          }
        );
      }

      emitToBooking(
        io,
        booking._id,
        "bookingUpdated",
        {
          bookingId: booking._id,
          status: "rejected",
          booking
        }
      );

      res.json({
        success: true,
        booking
      });
    } catch (e) {
      next(e);
    }
  }
);

/*
|--------------------------------------------------------------------------
| GENERATE HANDOVER OTP
|--------------------------------------------------------------------------
*/

router.post(
  "/:bookingId/generate-otp",
  auth,
  role("customer"),
  async (req, res, next) => {
    try {
      const booking = await Booking.findOne({
        _id: req.params.bookingId,
        customerId: req.user.id,
        status: "accepted"
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Accepted booking not found."
        });
      }

      const otp = generateOtp();

      booking.handoverOtpHash =
        await bcrypt.hash(otp, 10);

      booking.handoverOtpExpiresAt = new Date(
        Date.now() + 10 * 60 * 1000
      );

      await booking.save();

      const io = getIO(req);

      /*
       * Handover OTP is shown only to customer.
       * Customer tells the OTP to driver.
       */

      emitToUser(
        io,
        req.user.id,
        "handoverOtpGenerated",
        {
          bookingId: booking._id,
          otp,
          expiresAt:
            booking.handoverOtpExpiresAt
        }
      );

      emitToBooking(
        io,
        booking._id,
        "bookingUpdated",
        {
          bookingId: booking._id,
          status: booking.status,
          booking
        }
      );

      res.json({
        success: true,
        otp,
        expiresAt:
          booking.handoverOtpExpiresAt
      });
    } catch (e) {
      next(e);
    }
  }
);

/*
|--------------------------------------------------------------------------
| VERIFY HANDOVER OTP
|--------------------------------------------------------------------------
*/

router.post(
  "/:bookingId/verify-otp",
  auth,
  role("driver"),
  async (req, res, next) => {
    try {
      const booking = await getDriverBooking(req);

      if (!booking || booking.status !== "accepted") {
        return res.status(404).json({
          success: false,
          message: "Accepted booking not found."
        });
      }

      if (
        !booking.handoverOtpHash ||
        !booking.handoverOtpExpiresAt ||
        booking.handoverOtpExpiresAt < new Date()
      ) {
        return res.status(400).json({
          success: false,
          message: "OTP expired or not generated."
        });
      }

      if (
        !(await bcrypt.compare(
          String(req.body.otp),
          booking.handoverOtpHash
        ))
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP."
        });
      }

      booking.handoverOtpVerified = true;
      booking.handoverOtpHash = undefined;
      booking.handoverOtpExpiresAt = undefined;

      await booking.save();

      const driver = await Driver.findById(
        booking.driverId
      );

      const io = getIO(req);

      const eventData = {
        bookingId: booking._id,
        status: booking.status,
        handoverOtpVerified: true,
        booking
      };

      emitToUser(
        io,
        booking.customerId,
        "bookingUpdated",
        eventData
      );

      if (driver?.userId) {
        emitToUser(
          io,
          driver.userId,
          "bookingUpdated",
          eventData
        );
      }

      emitToBooking(
        io,
        booking._id,
        "bookingUpdated",
        eventData
      );

      res.json({
        success: true,
        message: "Handover verified.",
        booking
      });
    } catch (e) {
      next(e);
    }
  }
);

/*
|--------------------------------------------------------------------------
| START TRIP
|--------------------------------------------------------------------------
*/

router.patch(
  "/:bookingId/start",
  auth,
  role("driver"),
  async (req, res, next) => {
    try {
      const booking = await getDriverBooking(req);

      if (
        !booking ||
        booking.status !== "accepted" ||
        !booking.handoverOtpVerified
      ) {
        return res.status(400).json({
          success: false,
          message: "Handover must be verified first."
        });
      }

      booking.status = "ongoing";
      booking.startedAt = new Date();

      await booking.save();

      await notify({
        userId: booking.customerId,
        title: "Trip started",
        message: "Your DriveMate trip has started.",
        type: "trip_started",
        bookingId: booking._id,
        io: getIO(req)
      });

      const driver = await Driver.findById(
        booking.driverId
      );

      const io = getIO(req);

      const eventData = {
        bookingId: booking._id,
        status: "ongoing",
        startedAt: booking.startedAt,
        booking
      };

      /*
       * IMPORTANT:
       * Send tripStatus directly to customer.
       */

      emitToUser(
        io,
        booking.customerId,
        "tripStatus",
        eventData
      );

      /*
       * IMPORTANT:
       * Also send bookingUpdated directly to customer.
       * MyBookings.jsx listens for this event and immediately
       * changes the UI from Accepted → Ongoing.
       */

      emitToUser(
        io,
        booking.customerId,
        "bookingUpdated",
        eventData
      );

      /*
       * Update driver UI too.
       */

      if (driver?.userId) {
        emitToUser(
          io,
          driver.userId,
          "tripStatus",
          eventData
        );

        emitToUser(
          io,
          driver.userId,
          "bookingUpdated",
          eventData
        );
      }

      /*
       * Update anyone who joined the booking room.
       */

      emitToBooking(
        io,
        booking._id,
        "tripStatus",
        eventData
      );

      emitToBooking(
        io,
        booking._id,
        "bookingUpdated",
        eventData
      );

      res.json({
        success: true,
        booking
      });
    } catch (e) {
      next(e);
    }
  }
);

/*
|--------------------------------------------------------------------------
| GENERATE RETURN OTP
|--------------------------------------------------------------------------
*/

router.post(
  "/:bookingId/generate-return-otp",
  auth,
  role("customer"),
  async (req, res, next) => {
    try {
      const booking = await Booking.findOne({
        _id: req.params.bookingId,
        customerId: req.user.id,
        status: "ongoing"
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Ongoing booking not found."
        });
      }

      const otp = generateOtp();

      booking.returnOtpHash =
        await bcrypt.hash(otp, 10);

      booking.returnOtpExpiresAt = new Date(
        Date.now() + 10 * 60 * 1000
      );

      await booking.save();

      const io = getIO(req);

      /*
       * RETURN OTP IS SENT ONLY TO CUSTOMER.
       *
       * The customer tells this OTP to the driver.
       * The driver manually enters it.
       */

      emitToUser(
        io,
        booking.customerId,
        "returnOtpGenerated",
        {
          bookingId: booking._id,
          otp,
          expiresAt:
            booking.returnOtpExpiresAt
        }
      );

      /*
       * Notify booking room that return OTP exists,
       * but DO NOT include the actual OTP.
       */

      emitToBooking(
        io,
        booking._id,
        "bookingUpdated",
        {
          bookingId: booking._id,
          status: booking.status,
          returnOtpGenerated: true,
          booking
        }
      );

      res.json({
        success: true,
        otp,
        expiresAt:
          booking.returnOtpExpiresAt
      });
    } catch (e) {
      next(e);
    }
  }
);

/*
|--------------------------------------------------------------------------
| VERIFY RETURN OTP
|--------------------------------------------------------------------------
*/

router.post(
  "/:bookingId/verify-return-otp",
  auth,
  role("driver"),
  async (req, res, next) => {
    try {
      const booking = await getDriverBooking(req);

      if (!booking || booking.status !== "ongoing") {
        return res.status(404).json({
          success: false,
          message: "Ongoing booking not found."
        });
      }

      if (
        !booking.returnOtpHash ||
        !booking.returnOtpExpiresAt ||
        booking.returnOtpExpiresAt < new Date()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Return OTP expired or not generated."
        });
      }

      if (
        !(await bcrypt.compare(
          String(req.body.otp),
          booking.returnOtpHash
        ))
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP."
        });
      }

      booking.returnOtpVerified = true;
      booking.returnOtpHash = undefined;
      booking.returnOtpExpiresAt = undefined;

      await booking.save();

      const driver = await Driver.findById(
        booking.driverId
      );

      const io = getIO(req);

      const eventData = {
        bookingId: booking._id,
        status: booking.status,
        returnOtpVerified: true,
        booking
      };

      emitToUser(
        io,
        booking.customerId,
        "bookingUpdated",
        eventData
      );

      if (driver?.userId) {
        emitToUser(
          io,
          driver.userId,
          "bookingUpdated",
          eventData
        );
      }

      emitToBooking(
        io,
        booking._id,
        "bookingUpdated",
        eventData
      );

      res.json({
        success: true,
        message: "Return verified.",
        booking
      });
    } catch (e) {
      next(e);
    }
  }
);

/*
|--------------------------------------------------------------------------
| COMPLETE TRIP
|--------------------------------------------------------------------------
*/

router.patch(
  "/:bookingId/complete",
  auth,
  role("driver"),
  async (req, res, next) => {
    try {
      const booking = await getDriverBooking(req);

      if (
        !booking ||
        booking.status !== "ongoing" ||
        !booking.returnOtpVerified
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Return OTP must be verified first."
        });
      }

      booking.status = "completed";
      booking.completedAt = new Date();

      await booking.save();

      await Driver.findByIdAndUpdate(
        booking.driverId,
        {
          isAvailable: true
        }
      );

      await notify({
        userId: booking.customerId,
        title: "Trip completed",
        message:
          "Your DriveMate trip has been completed.",
        type: "trip_completed",
        bookingId: booking._id,
        io: getIO(req)
      });

      const driver = await Driver.findById(
        booking.driverId
      );

      const io = getIO(req);

      const eventData = {
        bookingId: booking._id,
        status: booking.status,
        completedAt: booking.completedAt,
        booking
      };

      emitToUser(
        io,
        booking.customerId,
        "tripStatus",
        eventData
      );

      emitToUser(
        io,
        booking.customerId,
        "bookingUpdated",
        eventData
      );

      if (driver?.userId) {
        emitToUser(
          io,
          driver.userId,
          "tripStatus",
          eventData
        );

        emitToUser(
          io,
          driver.userId,
          "bookingUpdated",
          {
            ...eventData,
            driverAvailable: true
          }
        );
      }

      emitToBooking(
        io,
        booking._id,
        "tripStatus",
        eventData
      );

      emitToBooking(
        io,
        booking._id,
        "bookingUpdated",
        eventData
      );

      res.json({
        success: true,
        booking
      });
    } catch (e) {
      next(e);
    }
  }
);

/*
|--------------------------------------------------------------------------
| CANCEL BOOKING
|--------------------------------------------------------------------------
*/

router.patch(
  "/:bookingId/cancel",
  auth,
  async (req, res, next) => {
    try {
      const booking = await Booking.findById(
        req.params.bookingId
      );

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found."
        });
      }

      const allowed =
        booking.customerId.toString() === req.user.id ||
        req.user.role === "admin";

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "Not authorized."
        });
      }

      if (
        ["completed", "cancelled"].includes(
          booking.status
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Booking cannot be cancelled."
        });
      }

      booking.status = "cancelled";
      booking.cancelledAt = new Date();
      booking.cancellationReason =
        req.body.reason || "Cancelled";

      await booking.save();

      const driver = await Driver.findById(
        booking.driverId
      );

      const io = getIO(req);

      const eventData = {
        bookingId: booking._id,
        status: booking.status,
        cancellationReason:
          booking.cancellationReason,
        booking
      };

      emitToUser(
        io,
        booking.customerId,
        "bookingUpdated",
        eventData
      );

      if (driver?.userId) {
        emitToUser(
          io,
          driver.userId,
          "bookingUpdated",
          eventData
        );
      }

      emitToBooking(
        io,
        booking._id,
        "bookingUpdated",
        eventData
      );

      res.json({
        success: true,
        booking
      });
    } catch (e) {
      next(e);
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET SINGLE BOOKING
|--------------------------------------------------------------------------
*/

router.get(
  "/:bookingId",
  auth,
  async (req, res, next) => {
    try {
      const booking = await Booking.findById(
        req.params.bookingId
      )
        .populate(
          "customerId",
          "name phone email"
        )
        .populate("vehicleId")
        .populate({
          path: "driverId",
          populate: {
            path: "userId",
            select: "name phone email"
          }
        });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found."
        });
      }

      const allowed =
        req.user.role === "admin" ||
        booking.customerId._id.toString() ===
          req.user.id ||
        (
          booking.driverId.userId &&
          booking.driverId.userId._id.toString() ===
            req.user.id
        );

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "Not authorized."
        });
      }

      res.json({
        success: true,
        booking
      });
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;