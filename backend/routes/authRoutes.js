const router = require("express").Router();
const bcrypt = require("bcrypt");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");
const { signToken } = require("../utils/auth");

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields are required."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters."
      });
    }

    if (!["customer", "driver"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be customer or driver."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (
      await User.findOne({
        $or: [
          { email: normalizedEmail },
          { phone: phone.trim() }
        ]
      })
    ) {
      return res.status(409).json({
        success: false,
        message: "Email or phone already registered."
      });
    }

    const hash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hash,
      phone: phone.trim(),
      role: role || "customer"
    });

    res.status(201).json({
      success: true,
      message: "Registration successful.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (e) {
    next(e);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success:false, message:"Email and password are required." });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success:false, message:"Invalid email or password." });
    }

    res.json({
      success:true,
      token:signToken(user),
      user:{ id:user._id, name:user.name, email:user.email, phone:user.phone, role:user.role }
    });
  } catch (e) { next(e); }
});

router.get("/protected", auth, (req,res) => res.json({ success:true, user:req.user }));

module.exports = router;
