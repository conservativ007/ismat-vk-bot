import { createServer } from "node:http";
import { config } from "./config.js";
import { handleMessageNew } from "./bot.js";

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

function isExpectedGroup(groupId) {
  return String(groupId) === String(config.vkGroupId).replace(/^-/, "");
}
