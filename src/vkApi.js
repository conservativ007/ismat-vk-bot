import { config } from './config.js';

const VK_API_BASE = 'https://api.vk.com/method';

export async function isGroupMember(userId) {
  const result = await vkMethod('groups.isMember', {
    group_id: normalizeGroupId(config.vkGroupId),
    user_id: userId
  });

  if (typeof result === 'number') {
    return result === 1;
  }

  return Boolean(result?.member);
}

export async function sendMessage(userId, message, keyboard = null) {
  const params = {
    peer_id: userId,
    random_id: Date.now() + Math.floor(Math.random() * 100000),
    message
  };

  if (keyboard) {
    params.keyboard = JSON.stringify(keyboard);
  }

  await vkMethod('messages.send', params);
}

export async function sendPeerMessage(peerId, message) {
  await vkMethod('messages.send', {
    peer_id: peerId,
    random_id: Date.now() + Math.floor(Math.random() * 100000),
    message
  });
}

async function vkMethod(method, params) {
  const body = new URLSearchParams({
    ...stringifyParams(params),
    access_token: config.vkGroupToken,
    v: config.vkApiVersion
  });

  const response = await fetch(`${VK_API_BASE}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const errorMessage = data.error?.error_msg || response.statusText;
    throw new Error(`VK API ${method} failed: ${errorMessage}`);
  }

  return data.response;
}

function stringifyParams(params) {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  );
}

function normalizeGroupId(groupId) {
  return String(groupId).replace(/^-/, '');
}
