/**
 * Recebe as confirmações do convite e grava na planilha.
 * Cole este código em Extensões > Apps Script, dentro da planilha.
 */
const NOME_ABA = "Confirmações";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const aba = obterAba_();
    const p = e.parameter;
    aba.appendRow([
      new Date(),
      limpar_(p.nome),
      limpar_(p.telefone),
      limpar_(p.presenca),
      Number(p.quantidade) || 0,
      limpar_(p.acompanhantes),
      limpar_(p.recado),
    ]);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Abrir a URL no navegador mostra isto (serve para testar se publicou certo)
function doGet() {
  return ContentService.createTextOutput("Convite da Suellen: recebendo confirmações ✔");
}

function obterAba_() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  let aba = planilha.getSheetByName(NOME_ABA);
  if (!aba) {
    aba = planilha.insertSheet(NOME_ABA);
    aba.appendRow(["Data/hora", "Nome", "WhatsApp", "Vai?", "Pessoas", "Acompanhantes", "Recado"]);
    aba.setFrozenRows(1);
    aba.getRange("A1:G1").setFontWeight("bold");
    // Total de pessoas confirmadas na coluna I
    aba.getRange("I1").setValue("Total confirmado");
    aba.getRange("I2").setFormula('=SUMIF(D:D,"Sim",E:E)');
  }
  return aba;
}

// Evita que alguém injete fórmula na planilha (ex.: começar o nome com "=")
function limpar_(v) {
  v = String(v || "").slice(0, 500);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}
