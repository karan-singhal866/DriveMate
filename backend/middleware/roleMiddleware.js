module.exports = (...roles) => (req, res, next) => {

  console.log("ROLE CHECK:");
  console.log("User role:", req.user?.role);
  console.log("Allowed roles:", roles);

  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Insufficient permissions."
    });
  }

  next();
};