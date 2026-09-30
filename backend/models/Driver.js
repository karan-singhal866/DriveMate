const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  licenseNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
  experience: { type: Number, required: true, min: 0, max: 80 },
  verificationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending", index: true },
  isAvailable: { type: Boolean, default: false, index: true },
  documents: { type: [String], default: [] },
  ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Driver", driverSchema);
