const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 1000 }
}, { timestamps: true });

module.exports = mongoose.model("Review", reviewSchema);
