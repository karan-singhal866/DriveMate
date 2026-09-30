const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const token = header.slice(7).trim();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id)
      .select("_id name email phone role driverApplicationStatus isActive");

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "Account is unavailable." });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      driverApplicationStatus: user.driverApplicationStatus
    };
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};
