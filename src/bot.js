import { couponKeyboard } from './keyboard.js';
import { isGroupMember, sendMessage } from './vkApi.js';
import { issueCoupon } from './wordpressApi.js';

const CHECK_COMMANDS = new Set([
  'проверить подписку',
  'получить купон',
  'купон',
  'скидка',
  'старт',
  'start'
]);

export async function handleMessageNew(event) {
  const message = event.object?.message;
  const userId = message?.from_id;

  if (!userId || userId < 1) {
    return;
  }

  const command = getCommand(message);

  if (!command) {
    await sendGreeting(userId);
    return;
  }

  await checkSubscriptionAndIssueCoupon(userId);
}

async function sendGreeting(userId) {
  await sendMessage(
    userId,
    'Здравствуйте! Подпишитесь на нашу группу VK и нажмите "Проверить подписку". После проверки я отправлю вам купон на скидку.',
    couponKeyboard()
  );
}

async function checkSubscriptionAndIssueCoupon(userId) {
  const member = await isGroupMember(userId);

  if (!member) {
    await sendMessage(
      userId,
      'Пока не вижу подписку. Подпишитесь на группу и нажмите "Проверить подписку" еще раз.',
      couponKeyboard()
    );
    return;
  }

  const coupon = await issueCoupon(userId);

  await sendMessage(
    userId,
    `Спасибо за подписку! Ваш купон на скидку: ${coupon}`
  );
}

function getCommand(message) {
  const payloadCommand = parsePayloadCommand(message.payload);

  if (payloadCommand === 'check_subscription') {
    return payloadCommand;
  }

  const text = String(message.text || '').trim().toLowerCase();

  if (CHECK_COMMANDS.has(text)) {
    return text;
  }

  return '';
}

function parsePayloadCommand(payload) {
  if (!payload) {
    return '';
  }

  try {
    return JSON.parse(payload).command || '';
  } catch {
    return '';
  }
}
