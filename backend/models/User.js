const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, minlength: 60 },
  phone: { type: String, required: true, unique: true, trim: true, index: true },
  role: { type: String, enum: ["customer", "driver", "admin"], default: "customer", index: true },
  driverApplicationStatus: { type: String, enum: ["none", "pending", "approved", "rejected"], default: "none" },
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
