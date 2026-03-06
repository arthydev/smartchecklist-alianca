<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
Env::load(__DIR__ . '/../.env');

require_once __DIR__ . '/../src/DB.php';
require_once __DIR__ . '/../src/Database/Migrator.php';

try {
    $migrator = new Migrator(DB::get(), __DIR__ . '/../database/migrations');
    $ran = $migrator->migrate();

    if (count($ran) === 0) {
        echo "No pending migrations.\n";
        exit(0);
    }

    echo "Applied migrations:\n";
    foreach ($ran as $version) {
        echo "- {$version}\n";
    }
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "Migration error: " . $e->getMessage() . PHP_EOL);
    exit(1);
}

