<?php
/**
 * Configuração da API (fica só no servidor, não é exposta ao navegador).
 */
return [
    // Senha para o painel (admin.html) ler e baixar as respostas. TROQUE!
    'admin_token' => 'troque-esta-senha',

    // Arquivo CSV onde as respostas são gravadas.
    // Se possível, aponte para uma pasta FORA da pasta pública do site.
    'csv_file' => __DIR__ . '/../dados/respostas.csv',

    // Separador do CSV (";" abre direto no Excel em português)
    'delimiter' => ';',
];
