/**
 * Convite da Suellen: lista de convidados + confirmações.
 * Cole este código em Extensões > Apps Script, dentro da planilha.
 *
 * Aba "Convidados": uma linha por convite (pessoa ou família), com o nome
 * de cada convidado separado por vírgula. O menu "Convite > Gerar códigos
 * e links" cria um link único para cada linha.
 *
 * Aba "Respostas": uma linha por PESSOA, dizendo se vai ou não. Se a família
 * responder de novo, as linhas dela são substituídas (não duplica).
 */

// ⚠️ Troque pelo endereço do seu site no GitHub Pages (com a barra no final)
const URL_SITE = "https://pedrolucashs.github.io/convite-suellen/";

const ABA_CONVIDADOS = "Convidados";
const ABA_RESPOSTAS = "Respostas";

// Colunas da aba Convidados
const COL = { CODIGO: 1, CONVITE: 2, PESSOAS: 3, FONE: 4, LINK: 5, ENVIAR: 6, SITUACAO: 7 };

// ---------------------------------------------------------------------
//  Menu na planilha
// ---------------------------------------------------------------------
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Convite")
    .addItem("Gerar códigos e links", "gerarCodigos")
    .addToUi();
}

function gerarCodigos() {
  const aba = abaConvidados_();
  const ultima = aba.getLastRow();
  if (ultima < 2) {
    SpreadsheetApp.getUi().alert("Preencha os convidados na aba \"Convidados\" (a partir da linha 2).");
    return;
  }
  const dados = aba.getRange(2, 1, ultima - 1, 4).getValues();
  const usados = new Set(dados.map((l) => String(l[0]).trim()).filter(String));
  let criados = 0;

  dados.forEach((linha, i) => {
    const convite = String(linha[COL.CONVITE - 1]).trim();
    if (!convite) return;
    const r = i + 2;

    // sem nomes na coluna C: o convite vale só para a própria pessoa da coluna B
    if (!String(linha[COL.PESSOAS - 1]).trim()) aba.getRange(r, COL.PESSOAS).setValue(convite);

    let codigo = String(linha[COL.CODIGO - 1]).trim();
    if (!codigo) {
      do { codigo = novoCodigo_(); } while (usados.has(codigo));
      usados.add(codigo);
      aba.getRange(r, COL.CODIGO).setValue(codigo);
      criados++;
    }

    const link = URL_SITE + "?c=" + codigo;
    const texto = "Olá, " + convite + "! 🌸\n\nCom muita alegria, convidamos você para a festa de 15 anos da Suellen.\n" +
      "Abra o convite e confirme sua presença:\n" + link;
    // com telefone: abre direto a conversa; sem telefone: o WhatsApp pede para escolher o contato
    let fone = String(linha[COL.FONE - 1]).replace(/\D/g, "");
    if (fone && fone.length <= 11) fone = "55" + fone;
    const destino = fone ? "https://wa.me/" + fone : "https://wa.me/";

    aba.getRange(r, COL.LINK).setValue(link);
    aba.getRange(r, COL.ENVIAR).setFormula('=HYPERLINK("' + destino + '?text=' + encodeURIComponent(texto) + '","Enviar")');
    // Situação: "—" (sem resposta) ou "2 de 3 vão"
    aba.getRange(r, COL.SITUACAO).setFormula(
      '=IF(COUNTIF(' + ABA_RESPOSTAS + '!B:B,A' + r + ')=0,"—",COUNTIFS(' + ABA_RESPOSTAS + '!B:B,A' + r + ',' +
      ABA_RESPOSTAS + '!E:E,"Sim")&" de "&COUNTIF(' + ABA_RESPOSTAS + '!B:B,A' + r + ')&" vão")');
  });

  abaRespostas_(); // garante que a aba de respostas existe (as fórmulas apontam para ela)
  SpreadsheetApp.getUi().alert(criados + " código(s) novo(s) criado(s). Use o link \"Enviar\" de cada linha para mandar pelo WhatsApp.");
}

function novoCodigo_() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O e 1/I para não confundir
  let c = "";
  for (let i = 0; i < 6; i++) c += letras[Math.floor(Math.random() * letras.length)];
  return c;
}

// ---------------------------------------------------------------------
//  Site → planilha
// ---------------------------------------------------------------------

// GET ?c=CODIGO → nome do convite, lista de pessoas e respostas anteriores
function doGet(e) {
  const codigo = String((e && e.parameter && e.parameter.c) || "").trim().toUpperCase();
  if (!codigo) {
    return ContentService.createTextOutput("Convite da Suellen: recebendo confirmações ✔");
  }
  const convite = buscarConvite_(codigo);
  let resposta = { ok: false };
  if (convite) {
    const anteriores = {};
    const aba = abaRespostas_();
    if (aba.getLastRow() > 1) {
      aba.getRange(2, 1, aba.getLastRow() - 1, 5).getValues()
        .filter((l) => String(l[1]) === codigo)
        .forEach((l) => (anteriores[String(l[3])] = String(l[4])));
    }
    resposta = { ok: true, nome: convite.nome, pessoas: convite.pessoas, respostas: anteriores };
  }
  return ContentService.createTextOutput(JSON.stringify(resposta))
    .setMimeType(ContentService.MimeType.JSON);
}

// POST → grava uma linha por pessoa
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const p = e.parameter;
    const codigo = String(p.codigo || "").trim().toUpperCase();
    const convite = codigo ? buscarConvite_(codigo) : null;
    let respostas = [];
    try { respostas = JSON.parse(p.respostas || "[]"); } catch (err) { respostas = []; }

    let linhas;
    const agora = new Date();
    const recado = limpar_(p.recado);

    if (convite) {
      // só aceita nomes que estão na lista daquele convite
      linhas = convite.pessoas.map((pessoa) => {
        const r = respostas.find((x) => x && String(x.nome) === pessoa);
        const vai = r && r.vai === "Sim" ? "Sim" : "Não";
        return [agora, codigo, convite.nome, pessoa, vai, recado];
      });
      apagarRespostas_(codigo);
    } else {
      // sem código: convite individual, só a primeira resposta conta
      const r = respostas[0] || {};
      linhas = [[agora, "", "(sem código)", limpar_(r.nome), r.vai === "Sim" ? "Sim" : "Não", recado]];
    }

    const aba = abaRespostas_();
    aba.getRange(aba.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------
//  Auxiliares
// ---------------------------------------------------------------------
function buscarConvite_(codigo) {
  const aba = abaConvidados_();
  if (aba.getLastRow() < 2) return null;
  const dados = aba.getRange(2, 1, aba.getLastRow() - 1, 3).getValues();
  const l = dados.find((x) => String(x[0]).trim().toUpperCase() === codigo);
  if (!l || !String(l[1]).trim()) return null;
  const nome = String(l[1]).trim();
  const pessoas = String(l[2]).split(/[,;\n]/).map((x) => x.trim()).filter(String);
  return { nome: nome, pessoas: pessoas.length ? pessoas : [nome] };
}

function apagarRespostas_(codigo) {
  const aba = abaRespostas_();
  if (aba.getLastRow() < 2) return;
  const codigos = aba.getRange(2, 2, aba.getLastRow() - 1, 1).getValues();
  for (let i = codigos.length - 1; i >= 0; i--) {
    if (String(codigos[i][0]) === codigo) aba.deleteRow(i + 2);
  }
}

function abaConvidados_() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  let aba = planilha.getSheetByName(ABA_CONVIDADOS);
  if (!aba) {
    aba = planilha.insertSheet(ABA_CONVIDADOS, 0);
    aba.appendRow(["Código", "Convite (pessoa ou família)", "Nomes dos convidados (separados por vírgula)",
      "WhatsApp", "Link do convite", "Enviar", "Situação"]);
    aba.appendRow(["", "Família Silva (exemplo)", "João Silva, Maria Silva, Pedro Silva", "88999999999"]);
    aba.setFrozenRows(1);
    aba.getRange("A1:G1").setFontWeight("bold");
    aba.setColumnWidth(2, 220);
    aba.setColumnWidth(3, 360);
    aba.setColumnWidth(4, 140);
    aba.setColumnWidth(5, 320);
    aba.getRange("D:D").setNumberFormat("@"); // telefone como texto
    aba.getRange("C:C").setWrap(true);
  }
  return aba;
}

function abaRespostas_() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  let aba = planilha.getSheetByName(ABA_RESPOSTAS);
  if (!aba) {
    aba = planilha.insertSheet(ABA_RESPOSTAS);
    aba.appendRow(["Data/hora", "Código", "Convite", "Pessoa", "Vai?", "Recado"]);
    aba.setFrozenRows(1);
    aba.getRange("A1:F1").setFontWeight("bold");
    aba.getRange("I1:I3").setValues([["Vão"], ["Não vão"], ["Convites sem resposta"]]);
    aba.getRange("J1").setFormula('=COUNTIF(E:E,"Sim")');
    aba.getRange("J2").setFormula('=COUNTIF(E:E,"Não")');
    aba.getRange("J3").setFormula('=COUNTIF(' + ABA_CONVIDADOS + '!G:G,"—")');
    aba.getRange("I1:J3").setFontWeight("bold");
  }
  return aba;
}

// Evita que alguém injete fórmula na planilha (ex.: começar o nome com "=")
function limpar_(v) {
  v = String(v || "").slice(0, 500);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}
