(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const semAnimacao = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dataFesta = new Date(CONFIG.dataFesta);
  const prazo = new Date(CONFIG.prazoConfirmacao);

  const fmtData = (d) =>
    d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Fortaleza" });
  const fmtHora = (d) =>
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Fortaleza" }) + "h";

  // ---------- Portão de entrada ----------
  const portao = $("portao");
  function abrirConvite() {
    document.body.classList.add("aberto");
    document.body.classList.remove("fechado");
    setTimeout(() => {
      portao.remove();
      revelarVisiveis();
    }, semAnimacao ? 50 : 1900);
    // primeira leva de animações começa enquanto as portas abrem
    setTimeout(revelarVisiveis, semAnimacao ? 0 : 700);
  }
  $("btn-abrir").addEventListener("click", abrirConvite);
  // Quem chega por um link #local / #confirmar / #presentes pula o portão
  if (location.hash && document.querySelector(location.hash)) abrirConvite();

  // ---------- Textos ----------
  $("texto-data").textContent = `dia ${fmtData(dataFesta)} às ${fmtHora(dataFesta)}`;
  $("texto-endereco").textContent = `na ${CONFIG.endereco}`;
  $("local-nome").textContent = CONFIG.localNome;
  $("local-endereco").textContent = CONFIG.endereco;
  $("local-data").textContent = `${fmtData(dataFesta)} · ${fmtHora(dataFesta)}`;
  $("link-mapa").href = CONFIG.linkMapa;
  $("texto-prazo").textContent = `Pedimos, com carinho, que confirme até ${fmtData(prazo)}.`;

  // Mapa embutido (só carrega quando o cartão aparece na tela)
  let mapaCarregado = false;
  function carregarMapa() {
    if (mapaCarregado) return;
    mapaCarregado = true;
    const iframe = document.createElement("iframe");
    iframe.src = "https://www.google.com/maps?output=embed&q=" + encodeURIComponent(CONFIG.endereco);
    iframe.loading = "lazy";
    iframe.title = "Mapa do local da festa";
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    $("mapa").appendChild(iframe);
  }

  // ---------- Revelar ao rolar ----------
  const revelaveis = document.querySelectorAll(".revelar");
  let observador = null;
  function revelarVisiveis() {
    if (!document.body.classList.contains("aberto")) return;
    if (!("IntersectionObserver" in window)) {
      revelaveis.forEach((el) => el.classList.add("visivel"));
      carregarMapa();
      return;
    }
    if (observador) return;
    observador = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("visivel");
        if (e.target.id === "local") carregarMapa();
        observador.unobserve(e.target);
      });
    }, { threshold: 0.12 });
    // pequeno atraso em cascata para os itens da capa
    let i = 0;
    revelaveis.forEach((el) => {
      if (el.closest(".capa")) el.style.transitionDelay = `${Math.min(i++ * 0.12, 1.2)}s`;
      observador.observe(el);
    });
  }

  // ---------- Contagem regressiva ----------
  let timer;
  function atualizarContagem() {
    const diff = dataFesta - new Date();
    if (diff <= 0) {
      $("contagem").innerHTML = "<p class='hoje'>É hoje!</p>";
      return clearInterval(timer);
    }
    const s = Math.floor(diff / 1000);
    $("cd-dias").textContent = Math.floor(s / 86400);
    $("cd-horas").textContent = String(Math.floor((s % 86400) / 3600)).padStart(2, "0");
    $("cd-min").textContent = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    $("cd-seg").textContent = String(s % 60).padStart(2, "0");
  }
  timer = setInterval(atualizarContagem, 1000);
  atualizarContagem();

  // ---------- Vaga-lumes ----------
  (function vagalumes() {
    const canvas = $("vagalumes");
    const ctx = canvas.getContext("2d");
    if (!ctx || semAnimacao) return;
    let w, h, dpr;
    const luzes = [];
    function medir() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = innerWidth * dpr;
      h = canvas.height = innerHeight * dpr;
    }
    medir();
    addEventListener("resize", medir);
    const total = innerWidth < 600 ? 22 : 38;
    for (let i = 0; i < total; i++) {
      luzes.push({
        x: Math.random(), y: Math.random(),
        vx: (Math.random() - 0.5) * 0.00025, vy: (Math.random() - 0.5) * 0.00025,
        r: 1.2 + Math.random() * 1.8, fase: Math.random() * Math.PI * 2, vel: 0.6 + Math.random() * 1.2,
      });
    }
    function quadro(t) {
      ctx.clearRect(0, 0, w, h);
      // dentro do portão (fundo verde) brilham mais
      const fechado = document.body.classList.contains("fechado");
      for (const l of luzes) {
        l.x += l.vx + Math.sin(t / 3000 + l.fase) * 0.00015;
        l.y += l.vy + Math.cos(t / 3500 + l.fase) * 0.00015;
        if (l.x < -0.05) l.x = 1.05; if (l.x > 1.05) l.x = -0.05;
        if (l.y < -0.05) l.y = 1.05; if (l.y > 1.05) l.y = -0.05;
        const brilho = 0.35 + 0.65 * Math.pow(Math.sin(t / 1000 * l.vel + l.fase) * 0.5 + 0.5, 2);
        const x = l.x * w, y = l.y * h, r = l.r * dpr;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
        const a = fechado ? brilho : brilho * 0.75;
        g.addColorStop(0, `rgba(255, 236, 170, ${a})`);
        g.addColorStop(0.25, `rgba(230, 196, 110, ${a * 0.5})`);
        g.addColorStop(1, "rgba(230, 196, 110, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(quadro);
    }
    requestAnimationFrame(quadro);
    // o canvas fica acima do portão enquanto ele está fechado
    canvas.style.zIndex = 60;
    $("btn-abrir").addEventListener("click", () => setTimeout(() => (canvas.style.zIndex = 0), 1200));
    if (document.body.classList.contains("aberto")) canvas.style.zIndex = 0;
  })();

  // ---------- Formulário ----------
  const form = $("form-rsvp");
  const qtd = $("inp-quantidade");
  qtd.max = CONFIG.maxPessoas;

  // Mantém o número entre 1 e o máximo, atualiza "pessoa/pessoas" e os botões
  function atualizarQuantidade(valor, corrigirCampo) {
    let n = parseInt(valor, 10);
    if (isNaN(n)) n = 1;
    n = Math.min(Math.max(n, 1), CONFIG.maxPessoas);
    if (corrigirCampo) qtd.value = n;
    $("sufixo-quantidade").textContent = n === 1 ? "pessoa" : "pessoas";
    $("btn-menos").disabled = n <= 1;
    $("btn-mais").disabled = n >= CONFIG.maxPessoas;
    $("bloco-acompanhantes").hidden = n <= 1;
    return n;
  }
  $("btn-menos").addEventListener("click", () => atualizarQuantidade(Number(qtd.value) - 1, true));
  $("btn-mais").addEventListener("click", () => atualizarQuantidade(Number(qtd.value) + 1, true));
  // Enquanto digita, atualiza o texto; se passar do máximo, corrige na hora
  qtd.addEventListener("input", () => {
    if (qtd.value !== "") atualizarQuantidade(qtd.value, Number(qtd.value) > CONFIG.maxPessoas || Number(qtd.value) < 1);
  });
  qtd.addEventListener("blur", () => atualizarQuantidade(qtd.value, true));
  qtd.addEventListener("focus", () => qtd.select());
  atualizarQuantidade(1, true);

  form.querySelectorAll("input[name=presenca]").forEach((r) =>
    r.addEventListener("change", () => {
      $("bloco-pessoas").hidden = form.presenca.value !== "Sim";
    })
  );

  const linkWhats = (texto) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`;
  $("link-whatsapp-encerrado").href = linkWhats("Olá! Sobre o convite dos 15 anos da Suellen...");

  if (new Date() > prazo) {
    form.hidden = true;
    $("encerrado").hidden = false;
  }

  // Máscara simples de telefone
  form.telefone.addEventListener("input", (e) => {
    const d = e.target.value.replace(/\D/g, "").slice(0, 11);
    let v = d;
    if (d.length > 2) v = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length > 7) v = `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
    e.target.value = v;
  });

  function mostrarErro(msg) {
    $("erro-form").textContent = msg;
    $("erro-form").hidden = !msg;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    mostrarErro("");

    const nome = form.nome.value.trim();
    const telefone = form.telefone.value.trim();
    const vai = form.presenca.value === "Sim";
    const quantidade = vai ? atualizarQuantidade(qtd.value, true) : 0;
    const acompanhantes = vai && quantidade > 1 ? form.acompanhantes.value.trim() : "";

    if (nome.length < 3) return mostrarErro("Por favor, escreva seu nome completo.");
    if (telefone.replace(/\D/g, "").length < 10) return mostrarErro("Confira o número de WhatsApp.");
    if (form.site.value) return; // robô

    const dados = new URLSearchParams({
      nome, telefone,
      presenca: vai ? "Sim" : "Não",
      quantidade, acompanhantes,
      recado: form.recado.value.trim(),
    });

    const btn = $("btn-enviar");
    btn.disabled = true;
    btn.textContent = "Enviando...";

    try {
      // no-cors: o Apps Script não devolve cabeçalho CORS; a gravação acontece mesmo assim
      await fetch(CONFIG.urlPlanilha, { method: "POST", mode: "no-cors", body: dados });

      form.hidden = true;
      $("sucesso").hidden = false;
      const primeiro = nome.split(" ")[0];
      $("sucesso-texto").textContent = vai
        ? `${primeiro}, sua presença foi confirmada${quantidade > 1 ? ` (${quantidade} pessoas)` : ""}. Até dia ${fmtData(dataFesta)}!`
        : `Que pena, ${primeiro}! Obrigado por avisar.`;
      const msg = vai
        ? `Olá! Confirmo minha presença na festa de 15 anos da Suellen. Nome: ${nome}. Total de pessoas: ${quantidade}.`
        : `Olá! Infelizmente não poderei ir à festa de 15 anos da Suellen. Nome: ${nome}.`;
      $("link-whatsapp").href = linkWhats(msg);
      $("confirmar").scrollIntoView({ behavior: semAnimacao ? "auto" : "smooth" });
    } catch (err) {
      mostrarErro("Não foi possível enviar agora. Verifique sua internet ou confirme pelo WhatsApp.");
      btn.disabled = false;
      btn.textContent = "Enviar confirmação";
    }
  });

  // ---------- Presentes ----------
  const lista = $("lista-presentes");
  if (!CONFIG.presentes.length) lista.hidden = true;
  CONFIG.presentes.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = p;
    lista.appendChild(li);
  });

  if (!CONFIG.chavePix) {
    $("bloco-pix").hidden = true;
  } else {
    $("pix-chave").textContent = CONFIG.chavePix;
    $("pix-nome").textContent = CONFIG.nomePix;
    $("btn-pix").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(CONFIG.chavePix);
      } catch (_) {
        const t = document.createElement("textarea");
        t.value = CONFIG.chavePix;
        document.body.appendChild(t);
        t.select();
        document.execCommand("copy");
        t.remove();
      }
      $("aviso-copiado").hidden = false;
      setTimeout(() => ($("aviso-copiado").hidden = true), 2500);
    });
  }
})();
