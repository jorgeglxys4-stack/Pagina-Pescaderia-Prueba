/* ============================================================
   Pescadería y Carnes La Perla — lógica del catálogo y del pedido
   ------------------------------------------------------------
   TODO LO QUE TIENES QUE CAMBIAR ESTÁ AQUÍ ABAJO, EN "CONFIG".
   ============================================================ */
(function () {
  "use strict";

  var CONFIG = {
    marca: "Pescadería y Carnes La Perla",
    ciudad: "Barranquilla",
    whatsapp: "573239518926",        // 57 + número, sin espacios ni signos
    telefonoVisible: "323 951 8926",
    minimoCompra: 40000,             // pedido mínimo en pesos
    envioGratisDesde: 180000,        // domicilio gratis desde este subtotal
    horaCorte: 14,                   // después de las 2 p.m. se entrega al día siguiente

    zonas: [
      { id: "norte",  nombre: "Norte",   detalle: "Alto Prado, El Prado, Villa Country, Buenavista", costo: 6000 },
      { id: "centro", nombre: "Centro",  detalle: "Barrio Abajo, San Roque, Rebolo, Centro",         costo: 5000 },
      { id: "sur",    nombre: "Sur",     detalle: "Simón Bolívar, La Paz, El Bosque, Lucero",        costo: 7000 },
      { id: "metro",  nombre: "Área metropolitana", detalle: "Soledad, Malambo, Puerto Colombia",    costo: 10000 }
    ],

    productos: [
      {
        id: "bagre", nombre: "Bagre en postas", cat: "pescados", lb: 11900,
        img: "img/bagre.svg", estado: "disponible",
        desc: "Fresco del día, cortado en postas gruesas. Perfecto para fritar o para un sancocho de pescado.",
        pres: ["Postas", "Entero limpio"]
      },
      {
        id: "tilapia", nombre: "Tilapia", cat: "pescados", lb: 9900,
        img: "img/tilapia.svg", estado: "disponible",
        desc: "Carne blanca y suave, sin espinas en el filete. La favorita para freír y para los niños.",
        pres: ["Entero limpio", "Filete", "En postas"]
      },
      {
        id: "mojarra", nombre: "Mojarra", cat: "pescados", lb: 10900,
        img: "img/mojarra.svg", estado: "disponible",
        desc: "Mojarra del día, entera y limpia. Ideal para fritar entera y acompañar con patacón.",
        pres: ["Entero limpio", "Filete"]
      },
      {
        id: "corvina", nombre: "Corvina en filete", cat: "pescados", lb: 19900,
        img: "img/corvina.svg", estado: "disponible",
        desc: "Filete alto en proteína, textura firme y sabor suave. Se entrega sin espinas.",
        pres: ["Filete sin piel", "Filete con piel"]
      },
      {
        id: "salmon", nombre: "Salmón", cat: "pescados", lb: 29900,
        img: "img/salmon.svg", estado: "ultimas",
        desc: "Salmón fresco, rico en omega 3. Llega en porciones listas para plancha u horno.",
        pres: ["Filete", "En postas"]
      },
      {
        id: "camaron", nombre: "Camarón pelado", cat: "mariscos", lb: 32900,
        img: "img/camaron.svg", estado: "ultimas",
        desc: "Camarón pelado y desvenado, listo para cocinar. Se entrega frío para conservar la frescura.",
        pres: ["Pelado", "Con cáscara"]
      },
      {
        id: "lomo-cerdo", nombre: "Lomo de cerdo", cat: "carnes", lb: 14900,
        img: "img/lomo-cerdo.svg", estado: "disponible",
        desc: "Lomo fresco, corte magro. Se entrega en medallones listos para la plancha.",
        pres: ["En medallones", "Entero", "En tajadas"]
      },
      {
        id: "costilla", nombre: "Costilla de res", cat: "carnes", lb: 16900,
        img: "img/costilla.svg", estado: "disponible",
        desc: "Costilla carnuda para ahumado, bandeja paisa o guiso. Corte del día.",
        pres: ["En tiras", "Entera"]
      },
      {
        id: "punta-anca", nombre: "Punta de anca", cat: "carnes", lb: 24900,
        img: "img/punta-anca.svg", estado: "agotado",
        desc: "Corte premium, jugoso y con buen marmoleo. Ideal para asar. Vuelve el jueves.",
        pres: ["Entera", "En tajadas"]
      }
    ]
  };

  var CATS = [
    { id: "todos",    nombre: "Todos" },
    { id: "pescados", nombre: "Pescados" },
    { id: "mariscos", nombre: "Mariscos" },
    { id: "carnes",   nombre: "Carnes" }
  ];

  /* ---------- utilidades ---------- */
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function pesos(n) {
    return "$" + Math.round(n).toLocaleString("es-CO");
  }
  function fmtQty(q) {
    return Number.isInteger(q) ? String(q) : q.toFixed(1).replace(".", ",");
  }
  function clampQty(q) {
    q = Math.round((parseFloat(q) || 0) * 2) / 2;
    if (q < 0.5) q = 0.5;
    if (q > 50) q = 50;
    return q;
  }
  function producto(id) {
    for (var i = 0; i < CONFIG.productos.length; i++) {
      if (CONFIG.productos[i].id === id) return CONFIG.productos[i];
    }
    return null;
  }

  /* ---------- estado ---------- */
  var KEY = "laperla:pedido:v1";
  var state = { items: [], zona: "", nombre: "", tel: "", dir: "", franja: "", notas: "", cat: "todos", q: "" };

  function guardar() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* file:// sin storage */ }
  }
  function cargar() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") return;
      ["zona", "nombre", "tel", "dir", "franja", "notas", "cat", "q"].forEach(function (k) {
        if (typeof data[k] === "string") state[k] = data[k];
      });
      if (Array.isArray(data.items)) {
        state.items = data.items.filter(function (it) {
          return it && producto(it.id) && typeof it.qty === "number";
        }).map(function (it) {
          return { id: it.id, pres: it.pres || "", qty: clampQty(it.qty) };
        });
      }
    } catch (e) { /* datos corruptos: se ignora */ }
  }

  /* ---------- cálculos ---------- */
  function filas() {
    return state.items.map(function (it) {
      var p = producto(it.id);
      return p ? { id: p.id, nombre: p.nombre, img: p.img, lb: p.lb, pres: it.pres, qty: it.qty } : null;
    }).filter(Boolean);
  }
  function subtotal() {
    return filas().reduce(function (a, it) { return a + it.lb * it.qty; }, 0);
  }
  function zonaActual() {
    for (var i = 0; i < CONFIG.zonas.length; i++) {
      if (CONFIG.zonas[i].id === state.zona) return CONFIG.zonas[i];
    }
    return null;
  }
  function costoEnvio() {
    var z = zonaActual();
    if (!z) return 0;
    if (subtotal() >= CONFIG.envioGratisDesde) return 0;
    return z.costo;
  }
  function totalPeso() {
    return filas().reduce(function (a, it) { return a + it.qty; }, 0);
  }
  function unidades() { return state.items.length; }

  /* ---------- render del catálogo ---------- */
  function estadoBadge(p) {
    if (p.estado === "agotado") return '<span class="badge badge--out">Agotado</span>';
    if (p.estado === "ultimas") return '<span class="badge badge--warn">Últimas unidades</span>';
    return '<span class="badge badge--ok">Disponible hoy</span>';
  }

  function cardHTML(p) {
    var agotado = p.estado === "agotado";
    var pres = p.pres && p.pres.length ? p.pres : ["Estándar"];
    var select = pres.length > 1
      ? '<label class="field-inline"><span>Presentación</span><select data-pres="' + p.id + '">' +
        pres.map(function (x) { return "<option>" + x + "</option>"; }).join("") +
        "</select></label>"
      : '<p class="field-inline"><span>Presentación: ' + pres[0] + "</span></p>";

    return (
      '<article class="card' + (agotado ? " is-out" : "") + '" data-id="' + p.id + '">' +
        '<div class="card-media">' +
          estadoBadge(p) +
          '<img src="' + p.img + '" alt="' + p.nombre + '" loading="lazy" width="600" height="450">' +
        "</div>" +
        '<div class="card-body">' +
          "<h3>" + p.nombre + "</h3>" +
          '<p class="card-desc">' + p.desc + "</p>" +
          '<div class="price"><strong>' + pesos(p.lb) + "</strong><span>/ libra</span>" +
            "<em>" + pesos(p.lb * 2) + " / kg</em></div>" +
          select +
          '<div class="card-actions">' +
            '<div class="stepper">' +
              '<button type="button" data-step="-1" aria-label="Quitar media libra">−</button>' +
              '<input type="number" min="0.5" step="0.5" value="1" inputmode="decimal" aria-label="Libras de ' + p.nombre + '"' + (agotado ? " disabled" : "") + ">" +
              '<button type="button" data-step="1" aria-label="Agregar media libra">+</button>' +
            "</div>" +
            '<button class="btn btn--primary btn--sm" data-add="' + p.id + '"' + (agotado ? " disabled" : "") + ">" +
              (agotado ? "No disponible" : "Agregar") +
            "</button>" +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function renderCatalogo() {
    var q = state.q.trim().toLowerCase();
    var lista = CONFIG.productos.filter(function (p) {
      var okCat = state.cat === "todos" || p.cat === state.cat;
      var okQ = !q || (p.nombre + " " + p.desc).toLowerCase().indexOf(q) !== -1;
      return okCat && okQ;
    });
    $("#grid").innerHTML = lista.map(cardHTML).join("");
    $("#empty").hidden = lista.length > 0;
  }

  function renderChips() {
    $("#chips").innerHTML = CATS.map(function (c) {
      return '<button class="chip' + (state.cat === c.id ? " is-active" : "") + '" data-cat="' + c.id + '" role="tab" aria-selected="' + (state.cat === c.id) + '">' + c.nombre + "</button>";
    }).join("");
  }

  function renderZonas() {
    $("#zonas-tabla").innerHTML = CONFIG.zonas.map(function (z) {
      return (
        '<div class="zrow' + (z.costo === 0 ? " zrow--free" : "") + '">' +
          '<div class="zrow__name"><b>' + z.nombre + "</b><small>" + z.detalle + "</small></div>" +
          '<div class="zrow__cost">' + (z.costo === 0 ? "Gratis" : pesos(z.costo)) + "</div>" +
        "</div>"
      );
    }).join("");
  }

  /* ---------- carrito ---------- */
  function renderCarrito() {
    var rows = filas();

    if (!rows.length) {
      $("#cart-items").innerHTML =
        '<div class="cart-empty">' +
          "<p>Tu pedido está vacío.</p>" +
          '<button class="btn btn--primary btn--sm" id="btn-seguir" type="button">Ver el catálogo</button>' +
        "</div>";
    } else {
      $("#cart-items").innerHTML = rows.map(function (it, i) {
        var key = it.id + "|" + it.pres;
        return (
          '<div class="ci" data-key="' + key + '">' +
            '<img src="' + it.img + '" alt="" loading="lazy">' +
            '<div class="ci__info">' +
              '<p class="ci__name">' + it.nombre + "</p>" +
              '<p class="ci__meta">' + (it.pres ? it.pres + " · " : "") + pesos(it.lb) + " / lb · " + fmtQty(it.qty / 2) + " kg</p>" +
              '<div class="stepper stepper--sm">' +
                '<button type="button" data-ci-step="-1" aria-label="Quitar media libra">−</button>' +
                "<span>" + fmtQty(it.qty) + " lb</span>" +
                '<button type="button" data-ci-step="1" aria-label="Agregar media libra">+</button>' +
              "</div>" +
            "</div>" +
            '<div class="ci__right">' +
              "<b>" + pesos(it.lb * it.qty) + "</b>" +
              '<button class="ci__del" type="button" data-ci-del>Quitar</button>' +
            "</div>" +
          "</div>"
        );
      }).join("");
    }

    var sub = subtotal();
    var env = costoEnvio();
    var tot = sub + env;
    var z = zonaActual();

    $("#sum-sub").textContent = pesos(sub);
    $("#sum-env").textContent = z ? (env === 0 ? "Gratis" : pesos(env)) : "—";
    $("#sum-total").textContent = pesos(tot);

    $("#cart-count").textContent = unidades();
    $("#fab-count").textContent = unidades();
    $("#fab-total").textContent = pesos(tot);
    $("#cart-sub").textContent = rows.length
      ? unidades() + (unidades() === 1 ? " producto" : " productos") + " · " + fmtQty(totalPeso()) + " lb"
      : "Aún no has agregado nada";

    $("#btn-enviar").disabled = rows.length === 0;

    // avisos
    var hint = "";
    if (rows.length) {
      if (sub < CONFIG.minimoCompra) {
        hint = "Faltan " + pesos(CONFIG.minimoCompra - sub) + " para el pedido mínimo de " + pesos(CONFIG.minimoCompra) + ".";
      } else if (!z) {
        hint = "Elige tu zona para calcular el domicilio.";
      } else if (env === 0 && sub > 0) {
        hint = "¡Domicilio gratis por tu compra!";
      }
    }
    $("#cart-hint").textContent = hint;
    $("#cart-hint").style.color = (env === 0 && sub >= CONFIG.minimoCompra && z) ? "#1f6b40" : "";

    $("#msg-preview").textContent = rows.length ? construirMensaje() : "Agrega productos para ver tu pedido.";
    guardar();
  }

  /* ---------- pedido ---------- */
  function construirMensaje() {
    var rows = filas();
    var z = zonaActual();
    var sub = subtotal();
    var env = costoEnvio();
    var tot = sub + env;
    var L = [];

    L.push("*NUEVO PEDIDO — " + CONFIG.marca + "*");
    L.push("Cliente: " + (state.nombre.trim() || "—"));
    if (state.tel.trim()) L.push("Teléfono: " + state.tel.trim());
    L.push("Zona: " + (z ? z.nombre : "—"));
    L.push("Dirección: " + (state.dir.trim() || "—"));
    if (state.franja) L.push("Entrega: " + state.franja);
    if (state.notas.trim()) L.push("Notas: " + state.notas.trim());

    L.push("");
    L.push("*Productos*");
    rows.forEach(function (it, i) {
      L.push(
        (i + 1) + ". " + it.nombre +
        (it.pres ? " · " + it.pres : "") +
        " — " + fmtQty(it.qty) + " lb — " + pesos(it.lb * it.qty)
      );
    });

    L.push("");
    L.push("Subtotal: " + pesos(sub));
    L.push("Domicilio: " + (env === 0 ? "GRATIS" : pesos(env)));
    L.push("*TOTAL: " + pesos(tot) + "*");
    L.push("");
    L.push("Pedido enviado desde la web 🐟");
    return L.join("\n");
  }

  function abrirWhatsApp(texto) {
    var url = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(texto);
    var w = window.open(url, "_blank", "noopener");
    if (!w) {
      // Si el navegador bloquea la pestaña, navegamos en la misma ventana
      window.location.href = url;
    }
  }

  function enviar() {
    var rows = filas();
    if (!rows.length) { toast("Agrega al menos un producto 🐟"); return; }
    if (subtotal() < CONFIG.minimoCompra) {
      toast("El pedido mínimo es " + pesos(CONFIG.minimoCompra));
      return;
    }

    var faltan = [];
    var campos = [
      { el: $("#f-nombre"), val: state.nombre, nombre: "tu nombre" },
      { el: $("#f-dir"),    val: state.dir,    nombre: "la dirección" },
      { el: $("#f-zona"),   val: state.zona,   nombre: "la zona" }
    ];
    campos.forEach(function (c) {
      var wrap = c.el.closest(".fld");
      if (!c.val.trim()) { wrap.classList.add("is-error"); faltan.push(c.nombre); }
      else { wrap.classList.remove("is-error"); }
    });
    if (faltan.length) {
      toast("Falta " + faltan.join(" y "));
      var primero = $(".fld.is-error input, .fld.is-error select");
      if (primero) { primero.focus(); primero.scrollIntoView({ block: "center", behavior: "smooth" }); }
      return;
    }

    abrirWhatsApp(construirMensaje());
    toast("Abriendo WhatsApp… solo pulsa enviar ✅");
  }

  /* ---------- carrito: acciones ---------- */
  function agregar(id, pres, qty) {
    var p = producto(id);
    if (!p || p.estado === "agotado") return;
    var existe = null;
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].id === id && state.items[i].pres === pres) { existe = state.items[i]; break; }
    }
    if (existe) existe.qty = clampQty(existe.qty + qty);
    else state.items.push({ id: id, pres: pres, qty: clampQty(qty) });

    renderCarrito();
    toast(p.nombre + " · " + fmtQty(clampQty(qty)) + " lb agregado");
  }

  function cambiarQty(key, delta) {
    var partes = key.split("|");
    for (var i = 0; i < state.items.length; i++) {
      var it = state.items[i];
      if (it.id === partes[0] && it.pres === partes[1]) {
        it.qty = clampQty(it.qty + delta);
        if (it.qty <= 0.5 && delta < 0) { /* deja media libra mínimo */ }
        break;
      }
    }
    renderCarrito();
  }

  function quitar(key) {
    state.items = state.items.filter(function (it) { return it.id + "|" + it.pres !== key; });
    renderCarrito();
  }

  /* ---------- carrito: abrir / cerrar ---------- */
  var ultimoFoco = null;
  function abrirCarrito() {
    ultimoFoco = document.activeElement;
    $("#cart").classList.add("is-open");
    $("#cart").setAttribute("aria-hidden", "false");
    $("#backdrop").hidden = false;
    $("#btn-cart").setAttribute("aria-expanded", "true");
    $("#fab").setAttribute("aria-expanded", "true");
    document.body.classList.add("is-locked");
    setTimeout(function () { $("#cart").focus({ preventScroll: true }); }, 60);
  }
  function cerrarCarrito() {
    $("#cart").classList.remove("is-open");
    $("#cart").setAttribute("aria-hidden", "true");
    $("#backdrop").hidden = true;
    $("#btn-cart").setAttribute("aria-expanded", "false");
    $("#fab").setAttribute("aria-expanded", "false");
    document.body.classList.remove("is-locked");
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }

  /* ---------- toast ---------- */
  var toastTimer = null;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-on"); }, 2600);
  }

  /* ---------- franjas de entrega ---------- */
  function opcionesFranja() {
    var ahora = new Date();
    var listo = [];
    if (ahora.getHours() < CONFIG.horaCorte) listo.push("Hoy, 3:00 – 7:00 p.m.");
    listo.push("Mañana, 9:00 a.m. – 12:00 m.");
    listo.push("Mañana, 2:00 – 6:00 p.m.");
    return listo;
  }

  /* ---------- arranque ---------- */
  function init() {
    cargar();

    // fecha y aviso de horario
    var hoy = new Date();
    $("#fecha-hoy").textContent = hoy.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
    $("#year").textContent = hoy.getFullYear();
    if (hoy.getHours() >= CONFIG.horaCorte) {
      $("#topbar-msg").textContent = "Pedidos después de las 2:00 p.m. se entregan mañana · Domicilio en Barranquilla y área metropolitana";
    }

    // textos de configuración
    $("#txt-minimo").textContent = pesos(CONFIG.minimoCompra);
    $("#txt-envio-gratis").textContent = "Domicilio gratis en compras desde " + pesos(CONFIG.envioGratisDesde) + ".";
    renderZonas();

    // select de zona
    $("#f-zona").innerHTML = '<option value="">Selecciona tu zona</option>' +
      CONFIG.zonas.map(function (z) {
        return '<option value="' + z.id + '">' + z.nombre + " — " + pesos(z.costo) + "</option>";
      }).join("");

    // select de franja
    $("#f-franja").innerHTML = '<option value="">Lo antes posible</option>' +
      opcionesFranja().map(function (f) { return "<option>" + f + "</option>"; }).join("");

    // restaurar formulario
    $("#f-nombre").value = state.nombre;
    $("#f-tel").value = state.tel;
    $("#f-dir").value = state.dir;
    $("#f-zona").value = state.zona;
    $("#f-franja").value = state.franja;
    $("#f-notas").value = state.notas;

    renderChips();
    renderCatalogo();
    renderCarrito();

    /* --- eventos: catálogo --- */
    $("#grid").addEventListener("click", function (e) {
      var card = e.target.closest(".card");
      if (!card) return;
      var id = card.getAttribute("data-id");

      var stepBtn = e.target.closest("[data-step]");
      if (stepBtn) {
        var input = $("input", card);
        input.value = clampQty(parseFloat(input.value) + parseFloat(stepBtn.getAttribute("data-step")));
        return;
      }

      var addBtn = e.target.closest("[data-add]");
      if (addBtn) {
        var sel = $("select[data-pres]", card);
        var pres = sel ? sel.value : (producto(id).pres || ["Estándar"])[0];
        agregar(id, pres, clampQty($("input", card).value));
      }
    });

    $("#grid").addEventListener("input", function (e) {
      if (e.target.matches('input[type="number"]')) {
        var v = parseFloat(e.target.value);
        if (v > 50) e.target.value = 50;
      }
    });

    /* --- eventos: filtros --- */
    $("#chips").addEventListener("click", function (e) {
      var chip = e.target.closest("[data-cat]");
      if (!chip) return;
      state.cat = chip.getAttribute("data-cat");
      renderChips();
      renderCatalogo();
      guardar();
    });

    var buscarTimer = null;
    $("#buscar").addEventListener("input", function (e) {
      var v = e.target.value;
      clearTimeout(buscarTimer);
      buscarTimer = setTimeout(function () {
        state.q = v;
        renderCatalogo();
      }, 120);
    });
    $("#buscar").value = state.q;

    /* --- eventos: carrito --- */
    $("#cart-items").addEventListener("click", function (e) {
      var del = e.target.closest("[data-ci-del]");
      var step = e.target.closest("[data-ci-step]");
      var seguir = e.target.closest("#btn-seguir");
      if (seguir) {
        cerrarCarrito();
        document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" });
        return;
      }
      var fila = e.target.closest(".ci");
      if (!fila) return;
      var key = fila.getAttribute("data-key");
      if (del) { quitar(key); return; }
      if (step) { cambiarQty(key, parseFloat(step.getAttribute("data-ci-step"))); }
    });

    $("#btn-cart").addEventListener("click", abrirCarrito);
    $("#fab").addEventListener("click", abrirCarrito);
    $("#btn-close-cart").addEventListener("click", cerrarCarrito);
    $("#backdrop").addEventListener("click", cerrarCarrito);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && $("#cart").classList.contains("is-open")) cerrarCarrito();
    });

    /* --- eventos: formulario --- */
    function bind(id, campo) {
      var el = $(id);
      el.addEventListener("input", function () {
        state[campo] = el.value;
        el.closest(".fld").classList.remove("is-error");
        renderCarrito();
      });
      el.addEventListener("change", function () {
        state[campo] = el.value;
        el.closest(".fld").classList.remove("is-error");
        renderCarrito();
      });
    }
    bind("#f-nombre", "nombre");
    bind("#f-tel", "tel");
    bind("#f-dir", "dir");
    bind("#f-zona", "zona");
    bind("#f-franja", "franja");
    bind("#f-notas", "notas");

    $("#btn-enviar").addEventListener("click", enviar);
    $("#btn-wa-directo").addEventListener("click", function () {
      abrirWhatsApp("Hola, quiero hacer un pedido 🐟 ¿Me ayudan?");
    });

    /* --- copiar mensaje --- */
    var btnCopiar = document.createElement("button");
    btnCopiar.type = "button";
    btnCopiar.className = "btn btn--sm";
    btnCopiar.style.cssText = "margin-top:.5rem;height:32px;background:#fff;border:1px solid var(--line)";
    btnCopiar.textContent = "Copiar mensaje";
    btnCopiar.addEventListener("click", function () {
      var txt = construirMensaje();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () { toast("Mensaje copiado ✅"); });
      } else {
        toast("Selecciona el texto y cópialo manualmente");
      }
    });
    $(".preview").appendChild(btnCopiar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
