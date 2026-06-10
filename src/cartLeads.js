import { config } from "./config.js";

const leads = new Map();
const LEAD_TTL_MS = 30 * 60 * 1000;

export function createCartLead(lead) {
  cleanupExpiredLeads();

  const leadId = `lead_${randomId()}`;
  const createdAt = Date.now();

  leads.set(leadId, {
    ...lead,
    leadId,
    createdAt,
  });

  return {
    leadId,
    redirectUrl: buildVkRedirectUrl(leadId),
  };
}

export function consumeCartLeadFromMessage(message) {
  cleanupExpiredLeads();

  const leadId = extractLeadId(message);

  if (!leadId) {
    return null;
  }

  const lead = leads.get(leadId);

  if (!lead) {
    return null;
  }

  leads.delete(leadId);
  return lead;
}

export function buildCartLeadAdminMessage(lead, userId) {
  const lines = [
    "Новая заявка по корзине",
    `Телефон: ${String(lead.phone || "").trim()}`,
    `Предпочитаемый способ связи: ${String(lead.contact_method || "").trim()}`,
    `Пользователь VK: https://vk.ru/id${userId}`,
    `VK ID: ${userId}`,
    "Корзина:",
  ];

  const items = Array.isArray(lead.items) ? lead.items : [];

  for (const item of items) {
    if (item.name) {
      lines.push(`- ${item.name}${item.quantity ? ` x ${item.quantity}` : ""}`);
    }

    if (item.url) {
      lines.push(String(item.url));
    }
  }

  if (lead.cart_url) {
    lines.push(`Страница корзины: ${lead.cart_url}`);
  }

  return lines.join("\n");
}

function buildVkRedirectUrl(leadId) {
  const target = config.vkGroupScreenName || `club${String(config.vkGroupId).replace(/^-/, "")}`;
  const ref = encodeURIComponent(leadId);

  return `https://vk.me/${target}?ref=${ref}`;
}

function extractLeadId(message) {
  const candidates = [
    message?.ref,
    message?.text,
    ...Object.values(parsePayload(message?.payload)),
  ];

  for (const candidate of candidates) {
    const match = String(candidate || "").match(/lead_[a-z0-9]+/i);

    if (match) {
      return match[0];
    }
  }

  return "";
}

function parsePayload(payload) {
  if (!payload) {
    return {};
  }

  try {
    return JSON.parse(payload);
  } catch {
    return {};
  }
}

function cleanupExpiredLeads() {
  const expiresBefore = Date.now() - LEAD_TTL_MS;

  for (const [leadId, lead] of leads.entries()) {
    if (lead.createdAt < expiresBefore) {
      leads.delete(leadId);
    }
  }
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}
