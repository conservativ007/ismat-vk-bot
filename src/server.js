import { createServer } from "node:http";
import { config } from "./config.js";
import { handleMessageNew } from "./bot.js";
import { createCartLead } from "./cartLeads.js";

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/health") {
      sendText(response, 200, "ok Im ALIVE!");
      return;
    }

    if (request.method === "POST" && request.url === "/vk/callback") {
      await handleVkCallback(request, response);
      return;
    }

    if (request.method === "POST" && request.url === "/lead/cart") {
      await handleCartLead(request, response);
      return;
    }

    sendText(response, 404, "not found");
  } catch (error) {
    console.error(error);
    sendText(response, 500, "error");
  }
});

server.listen(config.port, () => {
  console.log(`VK coupon bot is listening on port ${config.port}`);
});

async function handleVkCallback(request, response) {
  const event = await readJson(request);

  if (config.vkSecret && event.secret !== config.vkSecret) {
    sendText(response, 403, "forbidden");
    return;
  }

  if (!isExpectedGroup(event.group_id)) {
    sendText(response, 403, "forbidden");
    return;
  }

  if (event.type === "confirmation") {
    sendText(response, 200, config.vkConfirmationCode);
    return;
  }

  sendText(response, 200, "ok");

  if (event.type === "message_new") {
    handleMessageNew(event).catch((error) => {
      console.error("Failed to handle VK message:", error);
    });
  }
}

async function handleCartLead(request, response) {
  if (config.leadApiSecret === "") {
    sendJson(response, 500, { error: "lead api secret is not configured" });
    return;
  }

  if (config.leadPeerId === "") {
    sendJson(response, 500, { error: "lead peer id is not configured" });
    return;
  }

  const actualSecret = String(request.headers["x-vk-bot-secret"] || "");

  if (actualSecret !== config.leadApiSecret) {
    sendJson(response, 403, { error: "forbidden" });
    return;
  }

  const lead = await readJson(request);
  const createdLead = createCartLead(lead);

  sendJson(response, 200, {
    ok: true,
    lead_id: createdLead.leadId,
    redirect_url: createdLead.redirectUrl,
  });
}

async function readJson(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");

  if (!rawBody) {
    return {};
  }

  return JSON.parse(rawBody);
}

function sendText(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end(body);
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function isExpectedGroup(groupId) {
  return String(groupId) === String(config.vkGroupId).replace(/^-/, "");
}
