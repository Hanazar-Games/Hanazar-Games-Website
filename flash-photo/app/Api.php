<?php

declare(strict_types=1);

namespace FlashPhoto;

use Throwable;

final class Api
{
    /** @param array<string, mixed> $app @param callable(array<string, mixed>, array<string, mixed>): array<string, mixed> $callback */
    public static function run(array $app, string $rateScope, callable $callback): never
    {
        try {
            Request::requirePost();
            $identityHash = $app['identity']->ipHash();
            $app['rate_limiter']->consume($rateScope, $identityHash);
            $data = Request::postData();
            $result = $callback($app, $data);
            Response::json($result);
        } catch (RateLimitException $exception) {
            if ($exception->firstExceeded) {
                $app['flash']->recordAudit('rate_limit_triggered', null, null, ['scope' => $rateScope]);
            }
            Response::json(['error' => 'rate_limited'], $exception->status, $exception->headers);
        } catch (NotFoundException|ValidationException) {
            $app['flash']->recordAudit('illegal_request', null, null, ['scope' => $rateScope]);
            try {
                $app['rate_limiter']->consume('probe', $app['identity']->ipHash());
            } catch (RateLimitException $exception) {
                if ($exception->firstExceeded) {
                    $app['flash']->recordAudit('rate_limit_triggered', null, null, ['scope' => 'probe']);
                }
                Response::json(['error' => 'rate_limited'], 429, $exception->headers);
            }
            Response::json(['error' => 'not_found'], 404);
        } catch (HttpException $exception) {
            Response::json(['error' => 'request_failed'], $exception->status, $exception->headers);
        } catch (Throwable $exception) {
            $app['logger']->error('api.failure', ['exception_class' => $exception::class]);
            Response::json(['error' => 'server_error'], 500);
        }
    }
}
