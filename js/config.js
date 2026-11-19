/* =========================================================
   CONFIGURAÇÃO DA PESQUISA
   Edite este arquivo para personalizar a pesquisa.
   ========================================================= */
window.SURVEY_CONFIG = {
  // Nome exibido na tela inicial
  empresa: 'Nossa Empresa',

  // Pasta da API PHP que grava as respostas em CSV (dados/respostas.csv).
  // A senha do painel fica em api/config.php (no servidor).
  // Deixe vazio para salvar apenas no navegador (testes).
  apiUrl: 'api/',

  // (Opcional) Também enviar para o Google Sheets via Apps Script.
  webhookUrl: '',
  adminToken: '',
};
