<?php

declare(strict_types=1);

namespace FlashPhoto;

final class Request
{
    /** @return array<string, mixed> */
    public static function postData(int $maxBytes = 8192): array
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (is_string($contentType) && str_starts_with(strtolower($contentType), 'application/json')) {
            $length = isset($_SERVER['CONTENT_LENGTH']) ? (int) $_SERVER['CONTENT_LENGTH'] : 0;
            if ($length > $maxBytes) {
                throw new ValidationException('请求内容过大');
            }
            $raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
            if (!is_string($raw) || strlen($raw) > $maxBytes) {
                throw new ValidationException('请求内容无效');
            }
            $data = json_decode($raw, true);
            if (!is_array($data)) {
                throw new ValidationException('请求格式无效');
            }
            return $data;
        }
        return $_POST;
    }

    public static function requirePost(bool $json = true): void
    {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            Response::methodNotAllowed(['POST'], $json);
        }
    }
}
