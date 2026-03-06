<?php
require 'backend-php/src/Env.php';
Env::load('backend-php/.env');
require 'backend-php/src/DB.php';
try {
  $pdo = DB::get();
  $rows = $pdo->query('SHOW COLUMNS FROM `checklists`')->fetchAll(PDO::FETCH_ASSOC);
  foreach ($rows as $r) { echo $r['Field'].' | '.$r['Type'].' | '.$r['Null'].' | '.$r['Key'].PHP_EOL; }
} catch (Throwable $e) {
  echo 'ERR: '.$e->getMessage().PHP_EOL;
}
