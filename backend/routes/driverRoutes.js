const router = require("express").Router();

const Driver = require("../models/Driver");
const User = require("../models/User");
const Review = require("../models/Review");

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");


// =====================================================
// DRIVER APPLICATION
// =====================================================

router.post("/apply", auth, role("driver"), async (req, res, next) => {
  try {
    const {
      licenseNumber,
      experience,
      documents = []
    } = req.body;

    if (!licenseNumber || experience === undefined) {
      return res.status(400).json({
        success: false,
        message: "License number and experience are required."
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    if (
      user.driverApplicationStatus === "pending" ||
      user.driverApplicationStatus === "approved"
    ) {
      return res.status(409).json({
        success: false,
        message: "Driver application already exists."
      });
    }

    const driver = await Driver.create({
      userId: user._id,
      licenseNumber,
      experience,
      documents
    });

    user.driverApplicationStatus = "pending";
    await user.save();

    res.status(201).json({
      success: true,
      driver
    });
  } catch (e) {
    next(e);
  }
});


// =====================================================
// DRIVER PROFILE
// =====================================================

router.get("/profile", auth, role("driver"), async (req, res, next) => {
  try {
    const driver = await Driver.findOne({
      userId: req.user.id
    }).populate(
      "userId",
      "name email phone"
    );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver profile not found."
      });
    }

    res.json({
      success: true,
      driver
    });
  } catch (e) {
    next(e);
  }
});


// =====================================================
// DRIVER AVAILABILITY
// =====================================================

router.patch("/availability", auth, role("driver"), async (req, res, next) => {
  try {
    const driver = await Driver.findOne({
      userId: req.user.id
    });

    if (
      !driver ||
      driver.verificationStatus !== "verified"
    ) {
      return res.status(403).json({
        success: false,
        message: "Verified driver account required."
      });
    }

    driver.isAvailable = Boolean(req.body.isAvailable);

    await driver.save();

    // -------------------------------------------------
    // REAL-TIME AVAILABILITY UPDATE
    // -------------------------------------------------

    const io = req.app.get("io");

    if (io) {
      const availabilityData = {
        driverId: driver._id,
        userId: driver.userId,
        isAvailable: driver.isAvailable
      };

      // Update all connected customers
      io.emit(
        "driverAvailabilityUpdated",
        availabilityData
      );

      // Update the driver himself
      io.to(`user:${req.user.id}`).emit(
        "driverAvailabilityUpdated",
        availabilityData
      );
    }

    res.json({
      success: true,
      isAvailable: driver.isAvailable
    });
  } catch (e) {
    next(e);
  }
});


// =====================================================
// AVAILABLE DRIVERS
// =====================================================

router.get("/available", auth, role("customer"), async (req, res, next) => {
  try {
    const drivers = await Driver.find({
      verificationStatus: "verified",
      isAvailable: true
    })
      .populate(
        "userId",
        "name phone email"
      )
      .select("-documents");

    res.json({
      success: true,
      drivers
    });
  } catch (e) {
    next(e);
  }
});


// =====================================================
// DRIVER APPLICATIONS - ADMIN
// =====================================================

router.get("/applications", auth, role("admin"), async (req, res, next) => {
  try {
    const applications = await Driver.find({
      verificationStatus: "pending"
    }).populate(
      "userId",
      "name email phone driverApplicationStatus"
    );

    res.json({
      success: true,
      applications
    });
  } catch (e) {
    next(e);
  }
});


// =====================================================
// APPROVE DRIVER
// =====================================================

router.patch(
  "/applications/:userId/approve",
  auth,
  role("admin"),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.params.userId);

      const driver = await Driver.findOne({
        userId: user?._id
      });

      if (!user || !driver) {
        return res.status(404).json({
          success: false,
          message: "Application not found."
        });
      }

      user.role = "driver";
      user.driverApplicationStatus = "approved";

      await user.save();

      driver.verificationStatus = "verified";

      await driver.save();

      // Notify the driver in real time
      const io = req.app.get("io");

      if (io) {
        io.to(`user:${user._id.toString()}`).emit(
          "driverApplicationUpdated",
          {
            userId: user._id,
            status: "approved",
            driver
          }
        );
      }

      res.json({
        success: true,
        message: "Driver approved."
      });
    } catch (e) {
      next(e);
    }
  }
);


// =====================================================
// REJECT DRIVER
// =====================================================

router.patch(
  "/applications/:userId/reject",
  auth,
  role("admin"),
  async (req, res, next) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.userId,
        {
          driverApplicationStatus: "rejected"
        },
        {
          new: true
        }
      );

      await Driver.findOneAndUpdate(
        {
          userId: req.params.userId
        },
        {
          verificationStatus: "rejected",
          isAvailable: false
        }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Application not found."
        });
      }

      // Notify the driver in real time
      const io = req.app.get("io");

      if (io) {
        io.to(`user:${user._id.toString()}`).emit(
          "driverApplicationUpdated",
          {
            userId: user._id,
            status: "rejected"
          }
        );
      }

      res.json({
        success: true,
        message: "Driver application rejected."
      });
    } catch (e) {
      next(e);
    }
  }
);


module.exports = router;