const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const seedQuestions = [
  {
    question: "Which country consumes the most coffee per capita?",
    answer: "Finland! Finns drink around 12 kilograms (26 lbs) of coffee per person every year.",
    keywords: ["finland", "coffee"] // Fixed typo "coffe"
  },
  {
    question: "What music genre is surprisingly popular in Finland?",
    answer: "Heavy metal. Finland actually holds the world record for having the most heavy metal bands per capita.",
    keywords: ["finland", "music", "metal"]
  },
  {
    question: "Are there polar bears roaming around Finland?",
    answer: "No. Despite its snowy, northern reputation, Finland does not have polar bears. Their national animal is the brown bear.",
    keywords: ["finland", "bear", "polar"]
  },
  {
    question: "Do Finnish students get a lot of homework?",
    answer: "Very little. The Finnish education system is world-renowned for having minimal homework, short school days, and almost no standardized testing.",
    keywords: ["finland", "homework"]
  }
];

async function main() {
  await prisma.question.deleteMany();
  await prisma.keyword.deleteMany();

  console.log("Old data cleared.");

  for (const item of seedQuestions) {
    await prisma.question.create({
      data: {
        question: item.question,
        answer: item.answer,
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