
import "dotenv/config";

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Create PostgreSQL adapter
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

// Create Prisma Client
const prisma = new PrismaClient({
  adapter,
});


const plans = [
  {
    id: "free",
    name: "Free Plan",
    description: "Basic features for free users",
  },
  {
    id: "pro",
    name: "Pro Plan",
    description: "Advanced features for growing teams",
  },
  {
    id: "enterprise",
    name: "Enterprise Plan",
    description: "All features for enterprise users",
  },
];

async function seedPlans() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: {
        id: plan.id,
      },
      update: {
        name: plan.name,
        description: plan.description,
      },
      create: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
      },
    });
  }

  console.log("Plans seeded successfully!");
}

async function main() {
  await seedPlans();
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });