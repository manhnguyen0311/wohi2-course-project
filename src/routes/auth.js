const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const {NotFoundError, ValidationError, ConflictError, UnauthorizedError, ForbiddenError} = require("../lib/errors");

const SECRET = process.env.JWT_SECRET;


// POST /api/auth/register
router.post("/register", async (req, res) => {
  try{
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    throw new ValidationError("question and answer are mandatory");
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email },});

  if (existingUser) {
    throw new ConflictError("Email already registered");
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create the user
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name },
  });

  // Generate a token
  const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: "1h" });

  res.status(201).json({
    message: "User registered successfully",
    token,
  });
} catch (error) {
  if (error.code === 'P2002') {
      return res.status(400).json({ message: "Email already registered" });
    }
    return res.status(500).json({ message: "Internal server error" });
}
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ValidationError("email and password are required");
  }

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new UnauthorizedError("Invalid credentials");
  }

  // Verify the password
  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    throw new ForbiddenError("Invalid credentials");
  }

  // Generate a token
  const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: "1h" });

  res.json({ token });
});

module.exports = router; 