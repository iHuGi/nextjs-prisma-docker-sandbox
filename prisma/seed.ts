import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("❌ DATABASE_URL is not defined in your .env file.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const COUNTRIES = [
  { code: "PT", name: "Portugal" },
  { code: "GR", name: "Greece" },
  { code: "ES", name: "Spain" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "IT", name: "Italy" },
  { code: "GB", name: "United Kingdom" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "IE", name: "Ireland" },
  { code: "PL", name: "Poland" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "DK", name: "Denmark" },
  { code: "NO", name: "Norway" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
];

async function main() {
  console.log("🌍 Seeding countries (Europe, US, Canada)...");

  for (const country of COUNTRIES) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: { name: country.name },
      create: country,
    });
  }

  // 1. Seed Greece (GR) - Impact Sourcing
  const greece = await prisma.country.findUnique({ where: { code: "GR" } });

  if (greece) {
    const existingGrSection = await prisma.configSection.findFirst({
      where: { countryId: greece.id, name: "Impact Sourcing" },
    });

    if (!existingGrSection) {
      console.log('⚙️ Seeding "Impact Sourcing" section for Greece (GR)...');

      const grSection = await prisma.configSection.create({
        data: {
          countryId: greece.id,
          name: "Impact Sourcing",
          sortOrder: 0,
        },
      });

      const q1 = await prisma.configQuestion.create({
        data: {
          sectionId: grSection.id,
          label: "Impact Sourcing",
          displayAs: "list",
          answerType: "single",
          isRequired: true,
          confirmAiValue: true,
          sortOrder: 0,
          updatedBy: "Hugo Azevedo",
          answers: {
            create: [
              { label: "Yes", isPreFilled: false, sortOrder: 0 },
              { label: "No", isPreFilled: false, sortOrder: 1 },
              { label: "Not determined", isPreFilled: true, sortOrder: 2 },
            ],
          },
        },
      });

      await prisma.configQuestion.create({
        data: {
          sectionId: grSection.id,
          label: "Impact Sourcing Category",
          displayAs: "list",
          answerType: "multi",
          isRequired: true,
          confirmAiValue: true,
          sortOrder: 1,
          updatedBy: "Hugo Azevedo",
          conditionJson: {
            questionId: q1.id,
            expectedValue: "Yes",
          },
          answers: {
            create: [
              "Long-term unemployed",
              "Economically disadvantaged / low-income background",
              "Young person without higher education/formal qualification",
              "Refugee / displaced person",
              "Single-parent household",
              "Veteran",
              "Other approved Impact Sourcing category",
            ].map((label, idx) => ({
              label,
              isPreFilled: false,
              sortOrder: idx,
            })),
          },
        },
      });
    }
  }

  // 2. Seed Portugal (PT) - Perguntas Gerais
  const portugal = await prisma.country.findUnique({ where: { code: "PT" } });

  if (portugal) {
    const existingPtSection = await prisma.configSection.findFirst({
      where: { countryId: portugal.id, name: "Perguntas Gerais" },
    });

    if (!existingPtSection) {
      console.log('⚙️ Seeding "Perguntas Gerais" section for Portugal (PT)...');

      const ptSection = await prisma.configSection.create({
        data: {
          countryId: portugal.id,
          name: "Perguntas Gerais",
          sortOrder: 0,
        },
      });

      await prisma.configQuestion.create({
        data: {
          sectionId: ptSection.id,
          label: "Qual o teu clube?",
          displayAs: "list",
          answerType: "text",
          isRequired: true,
          confirmAiValue: false,
          preFilledText: "Sporting",
          sortOrder: 0,
          updatedBy: "Hugo Azevedo",
        },
      });

      await prisma.configQuestion.create({
        data: {
          sectionId: ptSection.id,
          label: "De onde és?",
          displayAs: "list",
          answerType: "text",
          isRequired: true,
          confirmAiValue: false,
          preFilledText: "Lisboa",
          sortOrder: 1,
          updatedBy: "Hugo Azevedo",
        },
      });

      const boolQ = await prisma.configQuestion.create({
        data: {
          sectionId: ptSection.id,
          label: "Sabes ler?",
          displayAs: "list",
          answerType: "bool",
          isRequired: true,
          confirmAiValue: false,
          sortOrder: 2,
          updatedBy: "Hugo Azevedo",
          answers: {
            create: [
              { label: "Yes", isPreFilled: true, isLocked: true, sortOrder: 0 },
              { label: "No", isPreFilled: false, isLocked: true, sortOrder: 1 },
            ],
          },
        },
      });

      await prisma.configQuestion.create({
        data: {
          sectionId: ptSection.id,
          label: "Das seguintes escolhas qual a que preferes?",
          displayAs: "list",
          answerType: "multi",
          isRequired: true,
          confirmAiValue: false,
          sortOrder: 3,
          updatedBy: "Hugo Azevedo",
          conditionJson: {
            questionId: boolQ.id,
            expectedValue: "Yes",
          },
          answers: {
            create: ["Portugal", "Benfica", "Sporting", "Porto", "Braga"].map(
              (label, idx) => ({
                label,
                isPreFilled: idx === 0,
                isLocked: false,
                sortOrder: idx,
              }),
            ),
          },
        },
      });

      await prisma.configQuestion.create({
        data: {
          sectionId: ptSection.id,
          label: "O que se passa?",
          displayAs: "list",
          answerType: "single",
          isRequired: true,
          confirmAiValue: false,
          sortOrder: 4,
          updatedBy: "Hugo Azevedo",
          answers: {
            create: ["Tudo", "Nada"].map((label, idx) => ({
              label,
              isPreFilled: idx === 0,
              isLocked: false,
              sortOrder: idx,
            })),
          },
        },
      });
    }

    // 3. Seed Candidate Test User
    console.log("👤 Seeding test candidate user...");
    const defaultUser = await prisma.user.upsert({
      where: { email: "hugo@email.com" },
      update: { countryId: portugal.id },
      create: {
        email: "hugo@email.com",
        countryId: portugal.id,
      },
    });

    await prisma.clubRecord.upsert({
      where: { userId: defaultUser.id },
      update: {},
      create: { userId: defaultUser.id, name: "Sporting" },
    });

    await prisma.ageRecord.upsert({
      where: { userId: defaultUser.id },
      update: {},
      create: {
        userId: defaultUser.id,
        birthDate: new Date("1991-08-02T00:00:00.000Z"),
      },
    });

    const existingMeta = await prisma.userMetadata.findUnique({
      where: { userId: defaultUser.id },
    });

    if (!existingMeta) {
      await prisma.userMetadata.create({
        data: {
          userId: defaultUser.id,
          customData: {
            countryCode: "PT",
            applicationResponses: {
              "Qual o teu clube?": "Sporting",
              "De onde és?": "Lisboa",
              "Sabes ler?": "Yes",
              "Das seguintes escolhas qual a que preferes?": [
                "Portugal",
                "Benfica",
                "Sporting",
                "Porto",
                "Braga",
              ],
              "O que se passa?": "Tudo",
            },
            lastSubmittedAt: new Date().toISOString(),
          },
        },
      });
    }
  }

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
