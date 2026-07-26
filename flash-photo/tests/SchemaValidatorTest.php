<?php

declare(strict_types=1);

namespace FlashPhoto\Tests;

use FlashPhoto\SchemaValidator;
use PDO;
use PHPUnit\Framework\TestCase;

final class SchemaValidatorTest extends TestCase
{
    public function testCurrentSchemaIsCompatible(): void
    {
        self::assertTrue(SchemaValidator::isCompatible($this->database($this->schema())));
    }

    public function testMissingCriticalColumnIsRejected(): void
    {
        $schema = str_replace('    viewer_hash TEXT,', '    viewer_reference TEXT,', $this->schema());

        self::assertFalse(SchemaValidator::isCompatible($this->database($schema)));
    }

    public function testWhitespaceCannotMergeDeclaredTypeWithNotNullConstraint(): void
    {
        $schema = str_replace(
            '    token_hash TEXT NOT NULL,',
            '    token_hash TEXTNOT NULL,',
            $this->schema(),
            $count
        );
        self::assertSame(1, $count);

        self::assertFalse(SchemaValidator::isCompatible($this->database($schema)));
    }

    public function testInvalidCleanupQueuePrimaryKeyIsRejected(): void
    {
        $schema = str_replace(
            '    PRIMARY KEY (category, item_name)',
            '    UNIQUE (category, item_name)',
            $this->schema()
        );

        self::assertFalse(SchemaValidator::isCompatible($this->database($schema)));
    }

    public function testEveryRequiredNamedIndexIsRejectedWhenMissing(): void
    {
        $indexes = [
            'idx_flash_images_token_hash',
            'idx_flash_images_expires_at',
            'idx_flash_images_unused_expires_at',
            'idx_flash_images_status',
            'idx_flash_images_created_at',
            'idx_flash_images_pending_terminal',
            'idx_flash_images_cleanup_unused',
            'idx_flash_images_cleanup_opened',
            'idx_flash_images_cleanup_retention',
            'idx_audit_logs_created_at',
            'idx_audit_logs_cleanup',
            'idx_audit_logs_event_type',
            'idx_audit_logs_flash_id',
            'idx_cleanup_queue_due',
            'idx_cleanup_queue_session_reference',
        ];

        foreach ($indexes as $index) {
            $schema = str_replace($index, $index . '_missing', $this->schema(), $count);
            self::assertSame(1, $count, $index);
            self::assertFalse(SchemaValidator::isCompatible($this->database($schema)), $index);
        }
    }

    public function testAlteredRequiredIndexDefinitionIsRejected(): void
    {
        $mutations = [
            ['ON flash_images(expires_at);', 'ON flash_images(expires_at, id);'],
            ['ON audit_logs(event_type);', 'ON audit_logs(event_type, id);'],
            ["WHERE status = 'opened';", "WHERE status = 'unused';"],
            ["WHERE status = 'opened';", "WHERE status = 'OPENED';"],
        ];

        foreach ($mutations as [$search, $replacement]) {
            $schema = str_replace($search, $replacement, $this->schema(), $count);
            self::assertSame(1, $count);
            self::assertFalse(SchemaValidator::isCompatible($this->database($schema)));
        }
    }

    public function testMissingBusinessCriticalUniqueConstraintsAreRejected(): void
    {
        $mutations = [
            [
                'CREATE UNIQUE INDEX IF NOT EXISTS idx_flash_images_token_hash',
                'CREATE INDEX IF NOT EXISTS idx_flash_images_token_hash',
            ],
            ['    UNIQUE (storage_name)', "    CHECK (storage_name <> '')"],
            ['    UNIQUE (username)', "    CHECK (username <> '')"],
        ];

        foreach ($mutations as [$search, $replacement]) {
            $schema = str_replace($search, $replacement, $this->schema(), $count);
            self::assertSame(1, $count);
            self::assertFalse(SchemaValidator::isCompatible($this->database($schema)));
        }
    }

    public function testWeakenedCheckConstraintIsRejected(): void
    {
        $schema = str_replace(
            "CHECK (access_mode IN ('global', 'first'))",
            'CHECK (1)',
            $this->schema(),
            $count
        );
        self::assertSame(1, $count);

        self::assertFalse(SchemaValidator::isCompatible($this->database($schema)));
    }

    public function testAdditionalRestrictiveConstraintIsRejected(): void
    {
        $schema = str_replace(
            "    UNIQUE (storage_name)\n);",
            "    UNIQUE (storage_name),\n    CHECK (status <> 'opened')\n);",
            $this->schema(),
            $count
        );
        self::assertSame(1, $count);

        self::assertFalse(SchemaValidator::isCompatible($this->database($schema)));
    }

    public function testCommentCannotSpoofRequiredCheckConstraint(): void
    {
        $constraint = "CHECK (access_mode IN ('global', 'first'))";
        $schema = str_replace($constraint, '/* ' . $constraint . ' */', $this->schema(), $count);
        self::assertSame(1, $count);

        self::assertFalse(SchemaValidator::isCompatible($this->database($schema)));
    }

    public function testQuotedConstraintNameCannotSpoofRequiredCheck(): void
    {
        $constraint = "CHECK (access_mode IN ('global', 'first'))";
        $schema = str_replace(
            $constraint,
            'CONSTRAINT "' . $constraint . '" CHECK (1)',
            $this->schema(),
            $count
        );
        self::assertSame(1, $count);

        self::assertFalse(SchemaValidator::isCompatible($this->database($schema)));
    }

    public function testQuotedLiteralCannotSpoofRequiredCheckConstraint(): void
    {
        $mutations = [
            [
                'file_size INTEGER NOT NULL CHECK (file_size > 0)',
                "file_size INTEGER NOT NULL DEFAULT 'CHECK (file_size > 0)' CHECK (1)",
            ],
            [
                'access_count INTEGER NOT NULL DEFAULT 0 CHECK (access_count >= 0)',
                "access_count INTEGER NOT NULL DEFAULT 'CHECK (access_count >= 0)' CHECK (1)",
            ],
        ];

        foreach ($mutations as [$search, $replacement]) {
            $schema = str_replace($search, $replacement, $this->schema(), $count);
            self::assertSame(1, $count);
            self::assertFalse(SchemaValidator::isCompatible($this->database($schema)));
        }
    }

    public function testMissingAdminUsernameCollationIsRejected(): void
    {
        $schema = str_replace(
            '    username TEXT NOT NULL COLLATE NOCASE,',
            '    username TEXT NOT NULL,',
            $this->schema(),
            $count
        );
        self::assertSame(1, $count);

        self::assertFalse(SchemaValidator::isCompatible($this->database($schema)));
    }

    public function testMissingAuditForeignKeysAreRejected(): void
    {
        $mutations = [
            [
                '    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,' . "\n",
                '',
            ],
            [
                ',' . "\n" . '    FOREIGN KEY (flash_id) REFERENCES flash_images(id) ON DELETE SET NULL',
                '',
            ],
        ];

        foreach ($mutations as [$search, $replacement]) {
            $schema = str_replace($search, $replacement, $this->schema(), $count);
            self::assertSame(1, $count);
            self::assertFalse(SchemaValidator::isCompatible($this->database($schema)));
        }
    }

    public function testDestructiveBeforeInsertTriggerIsRejected(): void
    {
        $schema = $this->schema() . <<<'SQL'

CREATE TRIGGER destroy_existing_images
BEFORE INSERT ON flash_images
BEGIN
    DELETE FROM flash_images;
END;
SQL;

        self::assertFalse(SchemaValidator::isCompatible($this->database($schema)));
    }

    public function testDestructiveTriggerWithSqliteWildcardPrefixIsRejected(): void
    {
        $schema = $this->schema() . <<<'SQL'

CREATE TRIGGER sqliteXdestroy_existing_images
BEFORE INSERT ON flash_images
BEGIN
    DELETE FROM flash_images;
END;
SQL;

        self::assertFalse(SchemaValidator::isCompatible($this->database($schema)));
    }

    public function testExtraViewIsRejected(): void
    {
        $schema = $this->schema() . "\nCREATE VIEW flash_image_tokens AS SELECT token_hash FROM flash_images;\n";

        self::assertFalse(SchemaValidator::isCompatible($this->database($schema)));
    }

    public function testExtraUniqueIndexIsRejected(): void
    {
        $schema = $this->schema()
            . "\nCREATE UNIQUE INDEX idx_flash_images_original_name_unique"
            . " ON flash_images(original_name);\n";

        self::assertFalse(SchemaValidator::isCompatible($this->database($schema)));
    }

    private function schema(): string
    {
        $schema = file_get_contents(dirname(__DIR__) . '/database/schema.sql');
        self::assertIsString($schema);
        return $schema;
    }

    private function database(string $schema): PDO
    {
        $pdo = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $pdo->exec($schema);
        return $pdo;
    }
}
