import { config } from './config.js';

export function couponKeyboard() {
  const buttons = [
    [
      {
        action: {
          type: 'text',
          label: 'Проверить подписку',
          payload: JSON.stringify({ command: 'check_subscription' })
        },
        color: 'positive'
      }
    ]
  ];

  if (config.vkGroupScreenName) {
    buttons.unshift([
      {
        action: {
          type: 'open_link',
          label: 'Подписаться',
          link: `https://vk.com/${config.vkGroupScreenName}`
        }
      }
    ]);
  }

  return {
    one_time: false,
    inline: false,
    buttons
  };
}
