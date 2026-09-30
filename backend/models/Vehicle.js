const mongoose = require("mongoose");

const inspectionSchema = new mongoose.Schema({
  fuelLevel: { type: Number, min: 0, max: 100 },
  odometerReading: { type: Number, min: 0 },
  existingDamage: { type: String, trim: true, maxlength: 2000 },
  notes: { type: String, trim: true, maxlength: 2000 },
  photos: { type: [String], default: [] }
}, { _id: false });

const vehicleSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  vehicleNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  vehicleType: { type: String, required: true, trim: true },
  brand: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  fuelType: { type: String, enum: ["petrol", "diesel", "cng", "electric", "hybrid"], required: true },
  inspection: inspectionSchema,
  returnInspection: inspectionSchema
}, { timestamps: true });

module.exports = mongoose.model("Vehicle", vehicleSchema);
