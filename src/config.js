import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

loadDotEnv();

export const config = {
  port: intEnv("PORT", 3100),
  vkGroupId: requiredEnv("VK_GROUP_ID"),
  vkGroupToken: requiredEnv("VK_GROUP_TOKEN"),
  vkConfirmationCode: requiredEnv("VK_CONFIRMATION_CODE"),
  vkSecret: process.env.VK_SECRET || "",
  vkApiVersion: process.env.VK_API_VERSION || "5.199",
  vkGroupScreenName: process.env.VK_GROUP_SCREEN_NAME || "",
  wpCouponEndpoint: requiredEnv("WP_COUPON_ENDPOINT"),
  wpApiSecret: requiredEnv("WP_API_SECRET"),
  couponDiscountPercent: intEnv("COUPON_DISCOUNT_PERCENT", 10),
  leadApiSecret: process.env.LEAD_API_SECRET || process.env.WP_API_SECRET || "",
  leadPeerId: process.env.LEAD_PEER_ID || "",
};

function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (key) {
      process.env[key] = value;
    }
  }
}

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function intEnv(name, fallback) {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer`);
  }

  return parsed;
}
