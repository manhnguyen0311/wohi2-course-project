const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");


async function resetDb() {
  
  await prisma.attempt.deleteMany();   
  await prisma.question.deleteMany();  
  await prisma.keyword.deleteMany();
  await prisma.user.deleteMany();
}

async function registerAndLogin(email = "a@test.io", name = "A") {
  await request(app)
    .post("/api/auth/register")
    .send({ email, password: "pw12345", name });

  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "pw12345" });

  return res.body.token;
}


async function createQuestion(token, overrides = {}) {
  const res = await request(app)
    .post("/api/questions") // Changed endpoint
    .set("Authorization", `Bearer ${token}`)
    .send({ 
      question: "What is 2+2?", 
      answer: "4", 
      keywords: ["math", "basics"], 
      ...overrides 
    });
  return res.body;
}

// --- Play Question Helper ---
async function playQuestion(token, questionId, answer) {
  const res = await request(app)
    .post(`/api/questions/${questionId}/play`)
    .set("Authorization", `Bearer ${token}`)
    .send({ answer });
  return res.body;
}


module.exports = { 
  resetDb, 
  registerAndLogin, 
  createQuestion, 
  playQuestion, 
  request, 
  app, 
  prisma 
};