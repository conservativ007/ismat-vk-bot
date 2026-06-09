import { config } from './config.js';

export async function issueCoupon(userId) {
  const response = await fetch(config.wpCouponEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-VK-BOT-SECRET': config.wpApiSecret
    },
    body: JSON.stringify({
      vk_user_id: userId,
      discount_percent: config.couponDiscountPercent
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || data.error || response.statusText;
    throw new Error(`WordPress coupon request failed: ${message}`);
  }

  const coupon = data.coupon || data.code;

  if (!coupon) {
    throw new Error('WordPress coupon response does not contain coupon or code');
  }

  return coupon;
}
