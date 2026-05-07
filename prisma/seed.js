const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();



const seedQuestions = [
  {
    question: "Which country consumes the most coffee per capita?",
    answer: "Finland",
    keywords: ["finland", "coffee"] 
  },
  {
    question: "What music genre is surprisingly popular in Finland?",
    answer: "Heavy metal",
    keywords: ["finland", "music", "metal"]
  },
  {
    question: "Are there polar bears roaming around Finland?",
    answer: "No",
    keywords: ["finland", "bear", "polar"]
  },
  {
    question: "Finnish students get a lot of homework? True or False",
    answer: "False",
    keywords: ["finland", "homework"]
  }
];

async function main() {
  await prisma.question.deleteMany();
  await prisma.keyword.deleteMany();
  await prisma.user.deleteMany();

    // Create a default user
  const hashedPassword = await bcrypt.hash("1234", 10);
  const user = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: hashedPassword,
      name: "Admin User",
    },
  });

  console.log("Created user:", user.email);

  console.log("Old data cleared.");

  for (const item of seedQuestions) {
    await prisma.question.create({
      data: {
        question: item.question,
        answer: item.answer,
        userId: user.id,
        keywords: {
          connectOrCreate: item.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });