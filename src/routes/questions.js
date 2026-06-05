const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require("path");
const {NotFoundError, ValidationError} = require("../lib/errors");
const {z} = require("zod");
const authenticateToken = require("../middleware/auth");

const QuestionInput = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  keywords: z.union([z.string(), z.array(z.string())]).optional(),
});


const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "..", "public", "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

function formatQuestion(question) {
  return {
    ...question,
    keywords: question.keywords.map((k) => k.name),
    userName: question.user ? question.user.name : null,
    solved: question.attempts ? question.attempts.length > 0 : false,
    user: undefined,
    attempts: undefined,
  };
}

router.use(authenticate);

// GET /api/questions, /api/questions?keyword=http&page=1&limit=5
router.get("/", async (req, res) => {
  const { keyword } = req.query;

  const where = keyword ? { keywords: { some: { name: keyword } } } : {};

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
  const skip = (page - 1) * limit;

  const [filteredQuestions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        keywords: true,
        user: true,
        attempts: {
          where: { userId: req.user.id, isCorrect: true },
          take: 1,
        },
      },
      orderBy: { id: "asc" },
      skip,
      take: limit,
    }),
    prisma.question.count({ where }),
  ]);

  res.json({
    data: filteredQuestions.map(formatQuestion),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /api/questions/:questionId
// Show a specific question
router.get("/:questionId", async (req, res) => {
  const questionId = Number(req.params.questionId);

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      keywords: true,
      user: true,
      attempts: {
        where: { userId: req.user.id, isCorrect: true },
        take: 1,
      },
    },
  });

  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  res.json(formatQuestion(question));
});

// POST /api/questions
router.post("/", upload.single("image"), async (req, res) => {
 try{

 
  const { question, answer, keywords } = QuestionInput.parse(req.body);



  const keywordsArray = typeof keywords === "string" 
    ? keywords.split(",").map(k => k.trim()).filter(k => k !== "")
    : (Array.isArray(keywords) ? keywords : []);

  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  
  const newQuestion = await prisma.question.create({
    data: {
      question,
      answer,
      imageUrl,
      userId: req.user.id,
      keywords: {
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw },
          create: { name: kw },
        })),
      },
    },
    include: { keywords: true },
  });

  res.status(201).json(formatQuestion(newQuestion));
} catch (error) {
  return res.status(400).json({ msg: "question and answer are mandatory" });
}
});

// GET /api/questions/user/stats
// Returns the logged-in user's total attempts and score
router.get("/user/stats", authenticateToken, async (req, res) => {
  try {
    const total = await prisma.attempt.count({
      where: { userId: req.user.id }
    });

    const correct = await prisma.attempt.count({
      where: { userId: req.user.id, isCorrect: true }
    });

    res.json({ totalAttempts: total, correctAnswers: correct });
  } catch (error) {
    res.status(500).json({ message: "Error fetching stats" });
  }
});

// GET /api/questions/game/leaderboard
// Returns top users ranked by their total correct answers
router.get("/game/leaderboard", async (req, res) => {
  try {
    // Group attempts by user, count correct ones, and sort descending
    const leaderboardData = await prisma.attempt.groupBy({
      by: ['userId'],
      where: { isCorrect: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5 // Top 5 players
    });

    // Populate user names so we aren't just showing IDs
    const leaderboard = await Promise.all(
  leaderboardData.map(async (entry) => {
    // 1. Safety check to make sure the entry data is valid
    if (!entry || !entry.userId) {
      return { name: "Unknown Player", score: 0 };
    }

    const user = await prisma.user.findUnique({
      where: { id: entry.userId },
      select: { name: true }
    });

    // 2. Double safety check: Verify 'user' is not null before reading '.name'
    return {
      name: user && user.name ? user.name : "Unknown Player",
      score: entry._count && entry._count.id ? entry._count.id : 0
    };
  })
);

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: "Error fetching leaderboard" });
  }
});


// PUT /api/questions/:questionId
router.put("/:questionId", isOwner, upload.single("image"), async (req, res) => {
  const questionId = Number(req.params.questionId);
  const { question, answer, keywords } = QuestionInput.parse(req.body);

  if (!question || !answer) {
    throw new ValidationError("question and answer are mandatory");
  }

  const keywordsArray = typeof keywords === "string" 
    ? keywords.split(",").map(k => k.trim()).filter(k => k !== "")
    : (Array.isArray(keywords) ? keywords : []);

  const data = {
    question,
    answer,
    keywords: {
      set: [],
      connectOrCreate: keywordsArray.map((kw) => ({
        where: { name: kw },
        create: { name: kw },
      })),
    },
  };

  if (req.file) data.imageUrl = `/uploads/${req.file.filename}`;

  const updatedQuestion = await prisma.question.update({
    where: { id: questionId },
    data,
    include: { keywords: true, user: true },
  });

  res.json(formatQuestion(updatedQuestion));
});

// DELETE /api/questions/:questionId
router.delete("/:questionId", isOwner, async (req, res) => {
  const questionId = Number(req.params.questionId);
  await prisma.question.delete({ where: { id: questionId } });
  res.json({ message: "Question deleted successfully" });
});

// POST /api/questions/:questionId/play
router.post("/:questionId/play", async (req, res) => {
  const { answer } = req.body;
  const questionId = Number(req.params.questionId);
  const userId = req.user.id; 

  const q = await prisma.question.findUnique({ where: { id: questionId } });
  if (!q) return res.status(404).json({ error: "Question not found" });

  const isCorrect = q.answer.toLowerCase().trim() === answer.toLowerCase().trim();

  await prisma.attempt.create({
    data: {
      userId,
      questionId,
      isCorrect,
    },
  });

  res.json({
    correct: isCorrect,
    correctAnswer: q.answer,
  });
});



module.exports = router;