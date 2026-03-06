<?php
echo "APP_ENV=".(getenv('APP_ENV') ?: '').PHP_EOL;

$vars = ['DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASS'];
foreach ($vars as $v) {
  $val = getenv($v);
  if ($v === 'DB_PASS') {
    echo "$v=" . (is_string($val) ? ('(len '.strlen($val).')') : '(null)') . PHP_EOL;
  } else {
    echo "$v=" . ($val !== false ? $val : '(null)') . PHP_EOL;
  }
}

echo "pdo_mysql=".(extension_loaded('pdo_mysql') ? 'yes' : 'no').PHP_EOL;

$h = getenv('DB_HOST') ?: '127.0.0.1';
$p = getenv('DB_PORT') ?: '3306';
$d = getenv('DB_NAME') ?: '';
$u = getenv('DB_USER') ?: 'root';
$pw = getenv('DB_PASS') ?: '';

$dsn = "mysql:host={$h};port={$p};dbname={$d};charset=utf8mb4";

try {
  $pdo = new PDO($dsn, $u, $pw, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  echo "PDO_OK\n";
  $x = $pdo->query("SELECT 1 AS one")->fetch();
  echo "SELECT_1_OK: ".json_encode($x)."\n";
} catch (Throwable $e) {
  echo "PDO_FAIL: ".$e->getMessage()."\n";
}
