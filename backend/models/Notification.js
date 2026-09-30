const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  type: { type: String, required: true, trim: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  isRead: { type: Boolean, default: false, index: true }
}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);
