<?php
require 'backend-php/src/Env.php';
Env::load('backend-php/.env');
require 'backend-php/src/DB.php';
try {
  $pdo = DB::get();
  $row = $pdo->query('SHOW CREATE TABLE `checklists`')->fetch(PDO::FETCH_ASSOC);
  print_r($row);
} catch (Throwable $e) {
  echo 'ERR: '.$e->getMessage().PHP_EOL;
}
