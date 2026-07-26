<?php

declare(strict_types=1);

namespace FlashPhoto\Tests;

use PHPUnit\Framework\TestCase;

final class AdminUxHardeningTest extends TestCase
{
    public function testLoginUsesSharedSubmitOnceGuard(): void
    {
        $login = $this->source('public/admin/login.php');

        self::assertStringContainsString('data-submit-once', $login);
        self::assertStringContainsString('<script src="/assets/admin.js" defer></script>', $login);
    }

    public function testLoginPostOnlyResumesAnExistingSessionContext(): void
    {
        $login = $this->source('public/admin/login.php');
        $post = strpos($login, "if (\$method === 'POST') {\n    \$sessionReady = \$app['auth']->startExistingSession();");
        $get = strpos($login, "} else {\n    try {", is_int($post) ? $post : 0);
        $admission = strpos($login, "consume('admin_session', \$app['identity']->ipHash())");
        $create = strpos($login, "\$app['auth']->startSession()");

        self::assertIsInt($post);
        self::assertIsInt($get);
        self::assertIsInt($admission);
        self::assertIsInt($create);
        self::assertTrue($post < $get && $get < $admission && $admission < $create);
        self::assertSame(1, substr_count($login, "\$app['auth']->startSession()"));
        self::assertStringContainsString("if (!\$sessionReady) {\n        http_response_code(409);", $login);
    }

    public function testCountdownUsesAConservativeRequestBoundAndMonotonicClock(): void
    {
        $script = $this->source('public/assets/admin.js');

        self::assertStringContainsString("getEntriesByType?.('navigation')", $script);
        self::assertStringContainsString('.requestStart', $script);
        self::assertStringContainsString('sampledAt - requestStartMs', $script);
        self::assertStringContainsString('serverTimeMs + 1000 + Math.ceil(elapsedSinceRequestMs)', $script);
        self::assertStringContainsString('Math.max(lastServerNowMs, monotonicServerMs)', $script);
        self::assertStringContainsString('Math.abs(wallElapsedMs - monotonicElapsedMs) > clockDriftToleranceMs', $script);
        self::assertStringContainsString('window.location.reload()', $script);
        self::assertStringNotContainsString('.responseStart', $script);
        self::assertStringNotContainsString('Math.max(lastServerNowMs, monotonicServerMs, wallServerMs)', $script);
    }

    public function testUploadNoncesAreBoundedExpiringAndConsumedIndividually(): void
    {
        $upload = $this->source('public/admin/upload.php');

        self::assertStringContainsString("\$_SESSION['admin_upload_nonces']", $upload);
        self::assertStringContainsString('$uploadNonceTtlSeconds', $upload);
        self::assertStringContainsString('$uploadNonceLimit', $upload);
        self::assertStringContainsString('$expiresAt <= $now', $upload);
        self::assertStringContainsString('array_slice($uploadNonces, 0, $uploadNonceLimit, true)', $upload);
        self::assertStringContainsString('unset($uploadNonces[$matchedNonce])', $upload);
        self::assertStringNotContainsString("unset(\$_SESSION['admin_upload_nonces'])", $upload);

        $consume = strpos($upload, 'unset($uploadNonces[$matchedNonce])');
        $create = strpos($upload, "['flash']->create(");
        self::assertIsInt($consume);
        self::assertIsInt($create);
        self::assertLessThan($create, $consume);
    }

    private function source(string $path): string
    {
        $contents = file_get_contents(dirname(__DIR__) . '/' . $path);
        self::assertIsString($contents);
        return $contents;
    }
}
