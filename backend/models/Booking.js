const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true, index: true },
  pickupLocation: { type: String, required: true, trim: true, maxlength: 500 },
  destination: { type: String, required: true, trim: true, maxlength: 500 },
  bookingDate: { type: Date, required: true, index: true },
  duration: { type: Number, required: true, min: 1, max: 72 },
  vehicleType: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "ongoing", "completed", "cancelled"],
    default: "pending",
    index: true
  },
  handoverOtpHash: String,
  handoverOtpExpiresAt: Date,
  handoverOtpVerified: { type: Boolean, default: false },
  returnOtpHash: String,
  returnOtpExpiresAt: Date,
  returnOtpVerified: { type: Boolean, default: false },
  startedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  cancellationReason: { type: String, maxlength: 500 },
  estimatedFare: { type: Number, min: 0, default: 0 },
  paymentStatus: {
    type: String,
    enum: ["not_required", "pending", "paid", "failed", "refunded"],
    default: "not_required"
  },
  paymentReference: String
}, { timestamps: true });

bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ driverId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Booking", bookingSchema);
