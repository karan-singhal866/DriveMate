const router = require("express").Router();
const Vehicle = require("../models/Vehicle");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

router.post("/create", auth, role("customer"), async (req,res,next) => {
  try {
    const { vehicleNumber, vehicleType, brand, model, fuelType } = req.body;
    if (!vehicleNumber || !vehicleType || !brand || !model || !fuelType) return res.status(400).json({ success:false, message:"All vehicle fields are required." });
    const vehicle = await Vehicle.create({ ownerId:req.user.id, vehicleNumber, vehicleType, brand, model, fuelType });
    res.status(201).json({ success:true, vehicle });
  } catch(e){ next(e); }
});

router.get("/my", auth, role("customer"), async (req,res,next) => {
  try { res.json({ success:true, vehicles:await Vehicle.find({ ownerId:req.user.id }).sort({createdAt:-1}) }); }
  catch(e){ next(e); }
});

router.get("/:vehicleId", auth, async (req,res,next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.vehicleId);
    if (!vehicle) return res.status(404).json({ success:false, message:"Vehicle not found." });
    if (req.user.role !== "admin" && vehicle.ownerId.toString() !== req.user.id) return res.status(403).json({ success:false, message:"Not authorized." });
    res.json({ success:true, vehicle });
  } catch(e){ next(e); }
});

router.patch("/:vehicleId/inspection", auth, role("customer"), async (req,res,next) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate({ _id:req.params.vehicleId, ownerId:req.user.id }, { inspection:req.body }, { new:true, runValidators:true });
    if (!vehicle) return res.status(404).json({ success:false, message:"Vehicle not found." });
    res.json({ success:true, vehicle });
  } catch(e){ next(e); }
});

router.patch("/:vehicleId/return-inspection", auth, role("driver"), async (req,res,next) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.vehicleId, { returnInspection:req.body }, { new:true, runValidators:true });
    if (!vehicle) return res.status(404).json({ success:false, message:"Vehicle not found." });
    res.json({ success:true, vehicle });
  } catch(e){ next(e); }
});

module.exports = router;
