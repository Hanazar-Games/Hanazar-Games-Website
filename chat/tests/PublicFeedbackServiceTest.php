<?php

declare(strict_types=1);

namespace Hanazar\Chat\Tests;

use Hanazar\Chat\FeedbackService;
use Hanazar\Chat\HttpException;

final class PublicFeedbackServiceTest extends TestCase
{
    private const NOW = 2_000_000_000;
    private FeedbackService $feedback;

    protected function setUp(): void
    {
        parent::setUp();
        $this->feedback = new FeedbackService($this->database);
    }

    public function testFeedbackIsPrivateForFiveMinutesThenAppearsOnThePublicWall(): void
    {
        $created = $this->feedback->create('希望增加更多皮肤提交说明。', self::NOW);

        self::assertMatchesRegularExpression('~^[A-Za-z0-9_-]{43}$~', $created['edit_token']);
        self::assertSame(self::NOW + 300, $created['publish_at']);
        self::assertSame([], $this->feedback->page(50, null, self::NOW + 299)['items']);
        self::assertSame('希望增加更多皮肤提交说明。', $this->feedback->page(50, null, self::NOW + 300)['items'][0]['content']);

        $row = $this->database->connection()->query(
            'SELECT edit_token_hash, content_hash FROM public_feedback',
        )->fetch();
        self::assertIsArray($row);
        self::assertSame(hash('sha256', $created['edit_token']), $row['edit_token_hash']);
        self::assertNotSame($created['edit_token'], $row['edit_token_hash']);
        self::assertNotSame('', $row['content_hash']);
    }

    public function testOwnerCanEditOnlyBeforeTheOriginalPublicationDeadline(): void
    {
        $created = $this->feedback->create('原始反馈内容足够长。', self::NOW);
        $edited = $this->feedback->edit(
            $created['id'],
            $created['edit_token'],
            '修改后的反馈内容仍然有效。',
            self::NOW + 299,
        );

        self::assertSame('修改后的反馈内容仍然有效。', $edited['content']);
        self::assertSame(self::NOW + 300, $edited['publish_at']);

        foreach (
            [
                ['token' => str_repeat('A', 43), 'now' => self::NOW + 100, 'status' => 404, 'code' => 'feedback_not_found'],
                ['token' => $created['edit_token'], 'now' => self::NOW + 300, 'status' => 409, 'code' => 'edit_window_closed'],
            ] as $case
        ) {
            try {
                $this->feedback->edit($created['id'], $case['token'], '再次修改反馈内容。', $case['now']);
                self::fail('Invalid edit must fail.');
            } catch (HttpException $exception) {
                self::assertSame($case['status'], $exception->status());
                self::assertSame($case['code'], $exception->errorCode());
            }
        }
    }

    public function testValidationDuplicateDefenseAndPreparedStatementsProtectTheWall(): void
    {
        foreach (['短', str_repeat('反馈', 251), "控制\x00字符内容", "双向覆盖\u{202E}字符"] as $content) {
            try {
                $this->feedback->create($content, self::NOW);
                self::fail('Invalid content must fail.');
            } catch (HttpException $exception) {
                self::assertSame(422, $exception->status());
                self::assertSame('invalid_feedback', $exception->errorCode());
            }
        }

        $content = "测试反馈'); DROP TABLE users; -- 仍应作为普通文本保存。";
        $this->feedback->create($content, self::NOW);
        self::assertSame($content, $this->feedback->page(50, null, self::NOW + 300)['items'][0]['content']);
        self::assertSame(0, (int) $this->database->connection()->query('SELECT COUNT(*) FROM users')->fetchColumn());

        try {
            $this->feedback->create($content, self::NOW + 1);
            self::fail('Recent duplicate content must fail.');
        } catch (HttpException $exception) {
            self::assertSame(409, $exception->status());
            self::assertSame('duplicate_feedback', $exception->errorCode());
        }
    }

    public function testPublicWallUsesStableCursorPaginationWithoutDuplicates(): void
    {
        for ($index = 1; $index <= 5; ++$index) {
            $this->feedback->create('分页反馈内容编号 ' . $index, self::NOW + $index);
        }

        $first = $this->feedback->page(2, null, self::NOW + 400);
        self::assertCount(2, $first['items']);
        self::assertSame([5, 4], array_column($first['items'], 'id'));
        self::assertSame(4, $first['next_cursor']);

        $second = $this->feedback->page(2, $first['next_cursor'], self::NOW + 400);
        self::assertSame([3, 2], array_column($second['items'], 'id'));
        self::assertSame(2, $second['next_cursor']);

        $last = $this->feedback->page(2, $second['next_cursor'], self::NOW + 400);
        self::assertSame([1], array_column($last['items'], 'id'));
        self::assertNull($last['next_cursor']);
    }
}
