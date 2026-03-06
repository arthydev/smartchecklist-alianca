<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
Env::load(__DIR__ . '/../.env');

require_once __DIR__ . '/../src/DB.php';
require_once __DIR__ . '/../src/Database/SeederRunner.php';

try {
    $runner = new SeederRunner(DB::get(), __DIR__ . '/../database/seeders');
    $ran = $runner->seed();

    if (count($ran) === 0) {
        echo "No pending seeders.\n";
        exit(0);
    }

    echo "Applied seeders:\n";
    foreach ($ran as $name) {
        echo "- {$name}\n";
    }
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "Seeder error: " . $e->getMessage() . PHP_EOL);
    exit(1);
}

