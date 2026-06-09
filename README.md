# VK Coupon Bot

Node.js service for VK Callback API. It checks whether a VK user is subscribed to a community, asks WordPress for a coupon, and sends the coupon back in VK messages.

## Requirements

- Node.js 18+
- VK community token with access to community messages
- VK Callback API enabled for the public HTTPS URL of this service
- WordPress REST endpoint that issues coupons

## Setup

1. Copy `.env.example` to `.env` and fill in real values.
2. Start the service:

```powershell
npm start
```

3. In VK community settings, open `Callback API` and set:

- URL: `https://yuor-domain.com/vk/callback`
- Secret key: optional. If you use it, set the same value as `VK_SECRET`
- Event types: `message_new`

4. Confirm the server in VK. For the `confirmation` event this service returns `VK_CONFIRMATION_CODE`.

## User Flow

1. User writes to the VK community.
2. Bot asks the user to subscribe and press `Проверить подписку`.
3. Bot checks `groups.isMember`.
4. If the user is subscribed, bot calls WordPress:

```http
POST /wp-json/vk-coupons/v1/issue
X-VK-BOT-SECRET: shared_secret_between_bot_and_wordpress
Content-Type: application/json
```

```json
{
  "vk_user_id": 123,
  "discount_percent": 10
}
```

Expected WordPress response:

```json
{
  "coupon": "VK-A7F3K9"
}
```

The response can also use `code` instead of `coupon`.

## WordPress Coupon Endpoint

The WordPress side is in `wordpress/vk-coupons.php`.

It registers:

```http
POST /wp-json/vk-coupons/v1/issue
```

The endpoint requires WooCommerce and checks the `X-VK-BOT-SECRET` header against `VK_COUPONS_API_SECRET`.

Recommended `wp-config.php` constant:

```php
define('VK_COUPONS_API_SECRET', 'same_secret_as_WP_API_SECRET_in_bot_env');
```

The endpoint creates a personal one-time percent coupon and returns the same coupon again if the same `vk_user_id` requests it twice.
