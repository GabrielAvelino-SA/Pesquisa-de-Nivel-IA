/**
 * RADAR IA · Integração com Google Sheets
 *
 * Como usar:
 * 1. Crie uma planilha no Google Sheets.
 * 2. Menu Extensões > Apps Script. Cole este código e salve.
 * 3. Troque o valor de TOKEN abaixo (é a "senha" do painel para ler os dados).
 * 4. Implantar > Nova implantação > Tipo: App da Web
 *      - Executar como: Eu
 *      - Quem pode acessar: Qualquer pessoa
 * 5. Copie a URL gerada (termina em /exec) e cole em js/config.js:
 *      webhookUrl: 'https://script.google.com/macros/s/XXXX/exec'
 *      adminToken: '<o mesmo TOKEN abaixo>'
 *
 * As colunas são criadas automaticamente. Se você adicionar perguntas novas,
 * novas colunas aparecem sozinhas.
 */
const SHEET_NAME = 'Respostas';
const TOKEN = 'troque-este-token';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const data = JSON.parse(e.postData.contents);
    const sh = getSheet_();
    let headers = sh.getLastColumn() > 0
      ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].filter(String)
      : [];
    const missing = Object.keys(data).filter(k => headers.indexOf(k) === -1);
    if (missing.length) {
      headers = headers.concat(missing);
      sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
    sh.appendRow(headers.map(h => (data[h] === undefined ? '' : data[h])));
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  if ((e.parameter.token || '') !== TOKEN) return json_({ ok: false, error: 'Token inválido' });
  const values = getSheet_().getDataRange().getValues();
  if (values.length < 2) return json_({ ok: true, rows: [] });
  const headers = values.shift();
  const rows = values.map(r => {
    const o = {};
    headers.forEach((h, i) => { if (h) o[h] = r[i] instanceof Date ? r[i].toISOString() : r[i]; });
    return o;
  });
  return json_({ ok: true, rows: rows });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
