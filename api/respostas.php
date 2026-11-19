<?php
/**
 * GET /api/respostas.php            → JSON { ok, rows: [...] }
 * GET /api/respostas.php?formato=csv → download do CSV original
 * Requer o cabeçalho  X-Admin-Token: <admin_token>
 */
declare(strict_types=1);
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$cfg = require __DIR__ . '/config.php';
$sep = $cfg['delimiter'];
$arquivo = $cfg['csv_file'];

$token = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
if ($cfg['admin_token'] === '' || !hash_equals((string)$cfg['admin_token'], (string)$token)) {
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'Senha inválida'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_GET['formato'] ?? '') === 'csv') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="respostas-radar-ia-' . date('Y-m-d') . '.csv"');
    if (is_file($arquivo)) readfile($arquivo);
    exit;
}

header('Content-Type: application/json; charset=utf-8');
$rows = [];
if (is_file($arquivo) && ($fp = fopen($arquivo, 'r'))) {
    flock($fp, LOCK_SH);
    $cab = fgetcsv($fp, 0, $sep, '"', '');
    if ($cab && $cab !== [null]) {
        $cab[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string)$cab[0]);
        $n = count($cab);
        while (($r = fgetcsv($fp, 0, $sep, '"', '')) !== false) {
            if ($r === [null]) continue;
            $rows[] = array_combine($cab, array_slice(array_pad($r, $n, ''), 0, $n));
        }
    }
    flock($fp, LOCK_UN);
    fclose($fp);
}
echo json_encode(['ok' => true, 'rows' => $rows], JSON_UNESCAPED_UNICODE);
