const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const User = require("../models/User");

router.get("/profile", auth, async (req,res,next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ success:true, user });
  } catch(e){ next(e); }
});

router.patch("/profile", auth, async (req,res,next) => {
  try {
    const allowed = ["name","phone"];
    const update = {};
    for (const key of allowed) if (req.body[key] !== undefined) update[key] = req.body[key];
    const user = await User.findByIdAndUpdate(req.user.id, update, { new:true, runValidators:true }).select("-password");
    res.json({ success:true, user });
  } catch(e){ next(e); }
});

module.exports = router;
