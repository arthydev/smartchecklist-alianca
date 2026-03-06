<?php
require 'backend-php/src/Env.php';
Env::load('backend-php/.env');
require 'backend-php/src/DB.php';
try {
  $pdo = DB::get();
  $row = $pdo->query("SHOW VARIABLES LIKE 'max_allowed_packet'")->fetch(PDO::FETCH_ASSOC);
  print_r($row);
} catch (Throwable $e) { echo 'ERR: '.$e->getMessage().PHP_EOL; }
