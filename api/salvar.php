<?php
/**
 * POST /api/salvar.php
 * Recebe uma resposta da pesquisa (JSON) e acrescenta uma linha ao CSV.
 * Novas colunas (ex.: perguntas adicionadas depois) são incluídas automaticamente.
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$cfg = require __DIR__ . '/config.php';

function responder(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    responder(405, ['ok' => false, 'error' => 'Método não permitido']);
}

$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > 30000) {
    responder(413, ['ok' => false, 'error' => 'Requisição muito grande']);
}

$data = json_decode($raw, true);
if (!is_array($data) || empty($data['id']) || !isset($data['score_geral'])) {
    responder(400, ['ok' => false, 'error' => 'Dados inválidos']);
}

/* ---------- Limpeza dos dados ---------- */
$linha = ['recebido_em' => date('c')];
foreach ($data as $chave => $valor) {
    if (!is_string($chave) || !preg_match('/^[A-Za-z0-9_]{1,40}$/', $chave)) continue;
    if (is_array($valor) || is_object($valor)) continue;
    $valor = trim(preg_replace('/[\r\n\t]+/', ' ', (string)$valor));
    $valor = function_exists('mb_substr') ? mb_substr($valor, 0, 1000) : substr($valor, 0, 1000);
    // Evita "injeção de fórmula" ao abrir no Excel
    if ($valor !== '' && !is_numeric($valor) && strpos('=+-@', $valor[0]) !== false) {
        $valor = "'" . $valor;
    }
    $linha[$chave] = $valor;
}

/* ---------- Gravação com trava ---------- */
$arquivo = $cfg['csv_file'];
$sep = $cfg['delimiter'];
$dir = dirname($arquivo);
if (!is_dir($dir) && !mkdir($dir, 0775, true)) {
    responder(500, ['ok' => false, 'error' => 'Não foi possível criar a pasta de dados']);
}

$fp = fopen($arquivo, 'c+');
if (!$fp || !flock($fp, LOCK_EX)) {
    responder(500, ['ok' => false, 'error' => 'Não foi possível abrir o arquivo de dados']);
}

try {
    rewind($fp);
    $cabecalho = fgetcsv($fp, 0, $sep, '"', '') ?: [];
    if ($cabecalho && $cabecalho !== [null]) {
        $cabecalho[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string)$cabecalho[0]);
    } else {
        $cabecalho = [];
    }

    // Evita duplicar a mesma resposta (reenvio após falha de rede)
    $duplicado = false;
    if ($cabecalho) {
        $idx = array_search('id', $cabecalho, true);
        if ($idx !== false) {
            while (($r = fgetcsv($fp, 0, $sep, '"', '')) !== false) {
                if (($r[$idx] ?? null) === $linha['id']) { $duplicado = true; break; }
            }
        }
    }

    $faltando = array_values(array_diff(array_keys($linha), $cabecalho));

    if ($duplicado) {
        // nada a gravar
    } elseif (!$cabecalho) {
        // Arquivo novo: BOM (acentos no Excel) + cabeçalho + linha
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, "\xEF\xBB\xBF");
        $cabecalho = array_keys($linha);
        fputcsv($fp, $cabecalho, $sep, '"', '');
        fputcsv($fp, array_map(fn($c) => $linha[$c] ?? '', $cabecalho), $sep, '"', '');
    } elseif ($faltando) {
        // Colunas novas: reescreve o arquivo com o cabeçalho ampliado
        rewind($fp);
        fgetcsv($fp, 0, $sep, '"', '');
        $linhas = [];
        while (($r = fgetcsv($fp, 0, $sep, '"', '')) !== false) {
            if ($r === [null]) continue;
            $linhas[] = $r;
        }
        $novo = array_merge($cabecalho, $faltando);
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, "\xEF\xBB\xBF");
        fputcsv($fp, $novo, $sep, '"', '');
        foreach ($linhas as $r) {
            fputcsv($fp, array_pad($r, count($novo), ''), $sep, '"', '');
        }
        fputcsv($fp, array_map(fn($c) => $linha[$c] ?? '', $novo), $sep, '"', '');
    } else {
        fseek($fp, 0, SEEK_END);
        fputcsv($fp, array_map(fn($c) => $linha[$c] ?? '', $cabecalho), $sep, '"', '');
    }
    fflush($fp);
} finally {
    flock($fp, LOCK_UN);
    fclose($fp);
}

responder($duplicado ? 200 : 201, ['ok' => true, 'duplicado' => $duplicado]);
