const express = require("express");
const app = express();

const questionsRouter = require("./routes/questions"); 
const PORT = process.env.PORT || 3000;

app.use(express.json());

// everything under /api/questions
app.use("/api/questions", questionsRouter);

app.use((req, res) => {
  res.status(404).json({msg: "Not found"});
});

// Start server
app.listen(PORT, () => {
  console.log("Server running on http://localhost:${PORT}");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
