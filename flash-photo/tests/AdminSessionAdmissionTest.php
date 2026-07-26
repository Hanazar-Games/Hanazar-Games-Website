<?php

declare(strict_types=1);

namespace FlashPhoto\Tests;

use PHPUnit\Framework\TestCase;

final class AdminSessionAdmissionTest extends TestCase
{
    public function testProtectedRoutesDoNotCreateAnonymousSessions(): void
    {
        $bootstrap = $this->source('public/admin/_bootstrap.php');

        self::assertStringNotContainsString("\$app['auth']->startSession();", $bootstrap);
        self::assertStringContainsString("\$app['auth']->startExistingSession()", $bootstrap);
        self::assertStringContainsString("\$app['auth']->logout()", $bootstrap);
    }

    public function testLoginAdmissionRunsBeforeAnonymousSessionCreation(): void
    {
        $login = $this->source('public/admin/login.php');
        $admission = strpos($login, "consume('admin_session', \$app['identity']->ipHash())");
        $session = strpos($login, "\$app['auth']->startSession()");

        self::assertNotFalse($admission);
        self::assertNotFalse($session);
        self::assertLessThan($session, $admission);
    }

    public function testDefaultConfigurationBoundsAnonymousSessionCreation(): void
    {
        $config = $this->source('config/config.example.php');
        $validator = $this->source('app/Config.php');
        $fixture = $this->source('tests/TestCase.php');

        self::assertStringContainsString("'admin_session' =>", $config);
        self::assertStringContainsString(
            "['login', 'admin_session', 'redeem', 'content', 'status', 'upload', 'probe']",
            $validator
        );
        self::assertStringContainsString("'admin_session' =>", $fixture);
    }

    private function source(string $path): string
    {
        $contents = file_get_contents(dirname(__DIR__) . '/' . $path);
        self::assertIsString($contents);
        return $contents;
    }
}
