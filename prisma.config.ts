import { defineConfig } from "prisma/config";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env file from backend directory
dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL || "",
  },
});
