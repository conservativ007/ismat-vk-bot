<?php
/**
 * Plugin Name: VK Coupons API
 * Description: Issues one-time WooCommerce coupons for verified VK subscribers.
 * Version: 0.1.0
 */

if (!defined('ABSPATH')) {
    exit;
}

const VK_COUPONS_REST_NAMESPACE = 'vk-coupons/v1';
const VK_COUPONS_META_VK_USER_ID = '_vk_coupons_vk_user_id';
const VK_COUPONS_META_ISSUED_AT = '_vk_coupons_issued_at';
const VK_COUPONS_OPTION_PREFIX = 'vk_coupons_user_';

add_action('rest_api_init', function () {
    register_rest_route(VK_COUPONS_REST_NAMESPACE, '/issue', [
        'methods' => WP_REST_Server::CREATABLE,
        'callback' => 'vk_coupons_issue_coupon',
        'permission_callback' => 'vk_coupons_can_issue_coupon',
    ]);
});

function vk_coupons_can_issue_coupon(WP_REST_Request $request) {
    $expected_secret = vk_coupons_get_api_secret();

    if ($expected_secret === '') {
        return new WP_Error(
            'vk_coupons_secret_missing',
            'Coupon API secret is not configured.',
            ['status' => 500]
        );
    }

    $actual_secret = (string) $request->get_header('x-vk-bot-secret');

    if (!hash_equals($expected_secret, $actual_secret)) {
        return new WP_Error(
            'vk_coupons_forbidden',
            'Invalid coupon API secret.',
            ['status' => 403]
        );
    }

    return true;
}

function vk_coupons_issue_coupon(WP_REST_Request $request) {
    if (!class_exists('WC_Coupon')) {
        return new WP_Error(
            'vk_coupons_woocommerce_missing',
            'WooCommerce is required to issue coupons.',
            ['status' => 500]
        );
    }

    $vk_user_id = absint($request->get_param('vk_user_id'));

    if ($vk_user_id <= 0) {
        return new WP_Error(
            'vk_coupons_invalid_vk_user_id',
            'vk_user_id must be a positive integer.',
            ['status' => 400]
        );
    }

    $existing_code = vk_coupons_get_existing_code($vk_user_id);

    if ($existing_code !== '') {
        return rest_ensure_response([
            'coupon' => $existing_code,
            'code' => $existing_code,
            'status' => 'existing',
        ]);
    }

    $discount_percent = vk_coupons_get_discount_percent($request);
    $coupon_code = vk_coupons_generate_unique_code();
    $coupon = new WC_Coupon();

    $coupon->set_code($coupon_code);
    $coupon->set_discount_type('percent');
    $coupon->set_amount($discount_percent);
    $coupon->set_individual_use(true);
    $coupon->set_usage_limit(1);
    $coupon->set_description(sprintf('VK coupon for user %d', $vk_user_id));

    $expires_days = absint(apply_filters('vk_coupons_expires_days', 30, $vk_user_id));

    if ($expires_days > 0) {
        $coupon->set_date_expires((new WC_DateTime())->modify('+' . $expires_days . ' days'));
    }

    $coupon_id = $coupon->save();

    update_post_meta($coupon_id, VK_COUPONS_META_VK_USER_ID, $vk_user_id);
    update_post_meta($coupon_id, VK_COUPONS_META_ISSUED_AT, current_time('mysql', true));
    add_option(vk_coupons_option_name($vk_user_id), $coupon_code, '', false);

    return rest_ensure_response([
        'coupon' => $coupon_code,
        'code' => $coupon_code,
        'status' => 'created',
        'discount_percent' => $discount_percent,
        'expires_days' => $expires_days,
    ]);
}

function vk_coupons_get_api_secret() {
    if (defined('VK_COUPONS_API_SECRET')) {
        return (string) VK_COUPONS_API_SECRET;
    }

    $env_secret = getenv('VK_COUPONS_API_SECRET');

    if (is_string($env_secret) && $env_secret !== '') {
        return $env_secret;
    }

    return (string) apply_filters('vk_coupons_api_secret', '');
}

function vk_coupons_get_existing_code($vk_user_id) {
    $option_code = (string) get_option(vk_coupons_option_name($vk_user_id), '');

    if ($option_code !== '' && wc_get_coupon_id_by_code($option_code)) {
        return $option_code;
    }

    $query = new WP_Query([
        'post_type' => 'shop_coupon',
        'post_status' => ['publish', 'draft'],
        'fields' => 'ids',
        'posts_per_page' => 1,
        'no_found_rows' => true,
        'meta_query' => [
            [
                'key' => VK_COUPONS_META_VK_USER_ID,
                'value' => $vk_user_id,
                'compare' => '=',
            ],
        ],
    ]);

    if (empty($query->posts[0])) {
        return '';
    }

    $code = get_the_title((int) $query->posts[0]);

    if ($code !== '') {
        update_option(vk_coupons_option_name($vk_user_id), $code, false);
    }

    return $code;
}

function vk_coupons_get_discount_percent(WP_REST_Request $request) {
    $discount_percent = absint($request->get_param('discount_percent'));

    if ($discount_percent <= 0) {
        $discount_percent = 10;
    }

    return min($discount_percent, 100);
}

function vk_coupons_generate_unique_code() {
    do {
        $code = 'VK-' . strtoupper(wp_generate_password(8, false, false));
    } while (wc_get_coupon_id_by_code($code));

    return $code;
}

function vk_coupons_option_name($vk_user_id) {
    return VK_COUPONS_OPTION_PREFIX . absint($vk_user_id);
}
