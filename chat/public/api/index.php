<?php

declare(strict_types=1);

use Hanazar\Chat\App;
use Hanazar\Chat\ClientIdentity;
use Hanazar\Chat\Config;
use Hanazar\Chat\HttpException;
use Hanazar\Chat\RateLimitException;
use Hanazar\Chat\SecurityHeaders;

require dirname(__DIR__, 2) . '/vendor/autoload.php';

const MAX_BODY_BYTES = 1048576;
const METHODS = ['GET', 'POST', 'PATCH', 'DELETE'];

try {
    $config = Config::fromEnvironment();
    $identity = ClientIdentity::resolve($_SERVER, $config->trustedProxies());
    $requestHost = strtolower(explode(':', $_SERVER['HTTP_HOST'] ?? '')[0]);
    if (!hash_equals($config->appHost(), $requestHost)) {
        throw new HttpException(400, 'invalid_host');
    }
    $requestOrigin = rtrim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''), '/');
    if ($requestOrigin !== '' && !hash_equals($config->appOrigin(), $requestOrigin)) {
        throw new HttpException(403, 'forbidden');
    }
    foreach (SecurityHeaders::json($identity->isSecure()) as $name => $value) {
        header($name . ': ' . $value);
    }
    session_name('hanazar_chat');
    session_save_path($config->sessionPath());
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
    $app = new App($config, $_SESSION);
    dispatch($app, $identity->ip());
} catch (RateLimitException $exception) {
    header('Retry-After: ' . $exception->retryAfter());
    respondError($exception->status(), $exception->errorCode(), 'Too many requests.');
} catch (HttpException $exception) {
    respondError($exception->status(), $exception->errorCode(), publicMessage($exception->errorCode()));
} catch (JsonException) {
    respondError(400, 'invalid_json', 'The JSON request body is invalid.');
} catch (Throwable) {
    respondError(500, 'internal_error', 'The request could not be completed.');
}

function dispatch(App $app, string $clientIp): never
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if (!in_array($method, METHODS, true)) {
        header('Allow: GET, POST, PATCH, DELETE');
        throw new HttpException(405, 'method_not_allowed');
    }

    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $path = preg_replace('~^/api(?:/index\.php)?~', '', $path) ?: '/';
    $path = '/' . trim($path, '/');
    if (!in_array($path, ['/auth/login', '/health'], true)) {
        $app->rateLimiter->consume('api', hash_hmac('sha256', $clientIp, $app->config->appKey()));
    }
    $body = requestBody($method);

    if ($path === '/health' && $method === 'GET') {
        if (!in_array($clientIp, ['127.0.0.1', '::1'], true)) {
            throw new HttpException(404, 'not_found');
        }
        $check = $app->database->connection()->query('PRAGMA quick_check')->fetchColumn();
        respond(['status' => $check === 'ok' ? 'ok' : 'degraded']);
    }

    if ($path === '/auth/session' && $method === 'GET') {
        try {
            $context = $app->auth->validate();
            respond([
                'authenticated' => true,
                'user_id' => $context->userId(),
                'csrf' => $app->csrf->token(),
                'event_cursor' => $app->events->cursor($context),
            ]);
        } catch (HttpException) {
            respond(['authenticated' => false, 'csrf' => $app->csrf->token()]);
        }
    }

    if ($path === '/auth/login' && $method === 'POST') {
        requireCsrf($app, $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
        session_regenerate_id(true);
        $context = $app->auth->login(
            stringField($body, 'username'),
            stringField($body, 'password'),
            hash_hmac('sha256', $clientIp, $app->config->appKey()),
        );
        respond([
            'user_id' => $context->userId(),
            'csrf' => $app->csrf->token(),
            'event_cursor' => $app->events->cursor($context),
        ]);
    }

    $context = $app->auth->validate();
    if ($method !== 'GET') {
        requireCsrf($app, $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
    }

    if ($path === '/auth/logout' && $method === 'POST') {
        $app->auth->logout();
        session_regenerate_id(true);
        respond(['logged_out' => true]);
    }
    if ($path === '/users' && $method === 'GET') {
        respond($app->users->search($context, (string) ($_GET['q'] ?? '')));
    }
    if ($path === '/users' && $method === 'POST') {
        if ($context->systemRole() !== 'admin') {
            throw new HttpException(403, 'forbidden');
        }
        respond($app->users->create($body), 201);
    }
    if ($path === '/rooms' && $method === 'GET') {
        respond($app->rooms->list($context, intQuery('before_id'), intQuery('limit') ?? 50));
    }
    if ($path === '/rooms/dm' && $method === 'POST') {
        respond($app->rooms->createDm($context, intField($body, 'user_id')), 201);
    }
    if ($path === '/rooms/group' && $method === 'POST') {
        $members = $body['member_ids'] ?? [];
        if (!is_array($members)) {
            throw new HttpException(422, 'invalid_members');
        }
        respond($app->rooms->createGroup($context, stringField($body, 'name'), array_map('intval', $members)), 201);
    }
    if (preg_match('~^/rooms/(\d+)$~', $path, $match) === 1 && $method === 'PATCH') {
        respond($app->rooms->rename($context, (int) $match[1], stringField($body, 'name')));
    }
    if (preg_match('~^/rooms/(\d+)$~', $path, $match) === 1 && $method === 'DELETE') {
        $app->rooms->leave($context, (int) $match[1]);
        respond(['left' => true]);
    }
    if (preg_match('~^/rooms/(\d+)/members$~', $path, $match) === 1 && $method === 'POST') {
        respond($app->rooms->addMember($context, (int) $match[1], intField($body, 'user_id')));
    }
    if (preg_match('~^/rooms/(\d+)/members/(\d+)$~', $path, $match) === 1 && $method === 'DELETE') {
        $app->rooms->removeMember($context, (int) $match[1], (int) $match[2]);
        respond(['removed' => true]);
    }
    if ($path === '/messages' && $method === 'GET') {
        respond($app->messages->list($context, requiredIntQuery('room_id'), intQuery('before_id'), intQuery('limit') ?? 50));
    }
    if ($path === '/messages' && $method === 'POST') {
        respond($app->messages->send($context, intField($body, 'room_id'), stringField($body, 'body'), stringField($body, 'client_nonce')), 201);
    }
    if (preg_match('~^/messages/(\d+)$~', $path, $match) === 1 && $method === 'PATCH') {
        respond($app->messages->edit($context, (int) $match[1], stringField($body, 'body'), intField($body, 'version')));
    }
    if (preg_match('~^/messages/(\d+)$~', $path, $match) === 1 && $method === 'DELETE') {
        respond($app->messages->delete($context, (int) $match[1], intField($body, 'version')));
    }
    if (preg_match('~^/messages/(\d+)/receipts$~', $path, $match) === 1 && $method === 'GET') {
        respond($app->messages->receipts($context, (int) $match[1]));
    }
    if ($path === '/read' && $method === 'POST') {
        respond($app->messages->markRead($context, intField($body, 'room_id'), intField($body, 'message_id')));
    }
    if ($path === '/events' && $method === 'GET') {
        $cursor = intQuery('cursor') ?? $app->events->cursor($context);
        session_write_close();
        respond($app->events->poll($context, $cursor, intQuery('timeout_ms') ?? 25000, 100));
    }
    if ($path === '/presence' && $method === 'GET') {
        respond($app->presence->roomState($context, requiredIntQuery('room_id')));
    }
    if ($path === '/presence' && $method === 'POST') {
        respond($app->presence->heartbeat($context, (string) ($body['status'] ?? 'online')));
    }
    if ($path === '/typing' && $method === 'POST') {
        $app->presence->setTyping($context, intField($body, 'room_id'), (bool) ($body['typing'] ?? false));
        respond(['typing' => (bool) ($body['typing'] ?? false)]);
    }

    throw new HttpException(404, 'not_found');
}

/** @return array<string, mixed> */
function requestBody(string $method): array
{
    if ($method === 'GET') {
        return [];
    }
    $length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > MAX_BODY_BYTES) {
        throw new HttpException(413, 'payload_too_large');
    }
    $contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
    if ($contentType !== 'application/json') {
        throw new HttpException(415, 'unsupported_media_type');
    }
    $raw = file_get_contents('php://input', false, null, 0, MAX_BODY_BYTES + 1);
    if (!is_string($raw) || strlen($raw) > MAX_BODY_BYTES) {
        throw new HttpException(413, 'payload_too_large');
    }
    if ($raw === '') {
        return [];
    }
    $decoded = json_decode($raw, true, flags: JSON_THROW_ON_ERROR);
    if (!is_array($decoded)) {
        throw new HttpException(400, 'invalid_json');
    }
    return $decoded;
}

function requireCsrf(App $app, ?string $token): void
{
    $expected = $app->sessions->get('csrf_token');
    if (!is_string($token) || !is_string($expected) || !hash_equals($expected, $token) || !$app->csrf->validate($token)) {
        throw new HttpException(403, 'csrf_invalid');
    }
}

/** @param array<string, mixed> $data */
function respond(array $data, int $status = 200): never
{
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($status);
    echo json_encode(['ok' => true, 'data' => $data, 'error' => null], JSON_THROW_ON_ERROR);
    exit;
}

function respondError(int $status, string $code, string $message): never
{
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($status);
    echo json_encode(['ok' => false, 'data' => null, 'error' => ['code' => $code, 'message' => $message]], JSON_THROW_ON_ERROR);
    exit;
}

function publicMessage(string $code): string
{
    return match ($code) {
        'invalid_credentials' => 'Invalid username or password.',
        'authentication_required', 'session_invalid', 'session_expired' => 'Authentication required.',
        'forbidden', 'room_forbidden', 'message_forbidden' => 'The action is not permitted.',
        'room_not_found', 'message_not_found', 'not_found' => 'The requested resource was not found.',
        default => 'The request could not be completed.',
    };
}

/** @param array<string, mixed> $body */
function stringField(array $body, string $key): string
{
    if (!isset($body[$key]) || !is_string($body[$key])) {
        throw new HttpException(422, 'invalid_request');
    }
    return $body[$key];
}

/** @param array<string, mixed> $body */
function intField(array $body, string $key): int
{
    $value = filter_var($body[$key] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($value === false) {
        throw new HttpException(422, 'invalid_request');
    }
    return (int) $value;
}

function intQuery(string $key): ?int
{
    if (!isset($_GET[$key]) || $_GET[$key] === '') {
        return null;
    }
    $value = filter_var($_GET[$key], FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
    if ($value === false) {
        throw new HttpException(422, 'invalid_request');
    }
    return (int) $value;
}

function requiredIntQuery(string $key): int
{
    $value = intQuery($key);
    if ($value === null || $value < 1) {
        throw new HttpException(422, 'invalid_request');
    }
    return $value;
}
