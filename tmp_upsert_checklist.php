<?php
require 'backend-php/src/Env.php';
Env::load('backend-php/.env');
require 'backend-php/src/DB.php';
require 'backend-php/src/Repositories/ChecklistsRepository.php';
try {
  $repo = new ChecklistsRepository();
  $payload = [
    'id' => 'DEBUG-TEST-1',
    'managerId' => '23f6218a-4804-4420-8039-445c12872469',
    'data' => [
      'id' => 'DEBUG-TEST-1',
      'managerId' => '23f6218a-4804-4420-8039-445c12872469',
      'userId' => 'u1',
      'userName' => 'U',
      'date' => date('c'),
      'equipmentNo' => 'E1',
      'shift' => 'Administrativo',
      'approvalStatus' => 'APPROVED',
      'items' => [],
      'evidence' => [],
      'observations' => 'x',
      'area' => 'SUCATA',
      'createdAt' => round(microtime(true)*1000),
      'customData' => ['ticketNumber' => 'T1']
    ],
  ];
  $saved = $repo->upsert($payload, '23f6218a-4804-4420-8039-445c12872469');
  echo "OK\n";
  print_r($saved);
} catch (Throwable $e) {
  echo get_class($e).': '.$e->getMessage()."\n";
}
