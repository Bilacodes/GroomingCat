/* =================================================================
   MeowSpa — booking logic
   Data dibaca/disimpan di localStorage sehingga tetap ada walau
   halaman dibuka ulang atau dibuka di tab/halaman yang berbeda.
   ================================================================= */

const STORAGE_KEY = "meowspa_bookings";

/* ---------- Storage helpers ---------- */

function getBookings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Gagal membaca data booking:", err);
    return [];
  }
}

function saveBookings(bookings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

function nextBookingCode(bookings) {
  const n = bookings.length + 1;
  return "CG-" + String(n).padStart(4, "0");
}

function updateBookingById(id, data) {
  const bookings = getBookings();
  const idx = bookings.findIndex((b) => b.id === id);
  if (idx === -1) return false;
  bookings[idx] = { ...bookings[idx], ...data };
  saveBookings(bookings);
  return true;
}

function deleteBookingById(id) {
  const bookings = getBookings().filter((b) => b.id !== id);
  saveBookings(bookings);
}

/* ---------- Small utils ---------- */

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function formatTanggalIndo(isoDate) {
  if (!isoDate) return "-";
  const bulan = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return `${d} ${bulan[m - 1]} ${y}`;
}

/* =================================================================
   Modal helpers (dipakai di halaman Data: modal Edit & Konfirmasi)
   ================================================================= */

let lastFocusedEl = null;
let pendingConfirmAction = null;

function openModal(modal) {
  if (!modal) return;
  lastFocusedEl = document.activeElement;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  // tunggu 1 frame supaya transisi opacity/scale ke "is-open" benar-benar diputar
  requestAnimationFrame(() => modal.classList.add("is-open"));
  const focusable = modal.querySelector("input, select, textarea, button");
  if (focusable) focusable.focus();
  document.addEventListener("keydown", onModalKeydown);
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove("is-open");
  document.body.classList.remove("modal-open");
  document.removeEventListener("keydown", onModalKeydown);
  // tunggu animasi fade-out selesai (250ms) sebelum benar-benar disembunyikan
  setTimeout(() => {
    modal.hidden = true;
  }, 250);
  if (lastFocusedEl) lastFocusedEl.focus();
}

function onModalKeydown(event) {
  if (event.key === "Escape") {
    closeModal(document.getElementById("edit-modal"));
    closeModal(document.getElementById("confirm-modal"));
  }
}

function openConfirmModal(title, text, onConfirm) {
  const modal = document.getElementById("confirm-modal");
  if (!modal) return;
  document.getElementById("confirm-modal-title").textContent = title;
  document.getElementById("confirm-modal-text").textContent = text;
  pendingConfirmAction = onConfirm;
  openModal(modal);
}

/* =================================================================
   Halaman Form (booking.html)
   ================================================================= */

function initFormPage() {
  const form = document.getElementById("booking-form");
  if (!form) return;

  const dateInput = document.getElementById("tanggal");
  if (dateInput) {
    dateInput.min = new Date().toISOString().split("T")[0];
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    handleFormSubmit(form);
  });
}

function showFieldError(name, message, prefix) {
  const selectorName = (prefix || "") + name;
  const el = document.querySelector(`.field-error[data-for="${selectorName}"]`);
  if (el) el.textContent = message || "";
}

function showAlert(message, type, alertId) {
  const alertBox = document.getElementById(alertId || "form-alert");
  if (!alertBox) return;
  alertBox.textContent = type === "success" ? `🐾 ${message}` : message;
  // reset class lalu pasang ulang supaya animasinya selalu "main" lagi,
  // bukan cuma sekali waktu elemen pertama kali dibuat
  alertBox.className = "form-alert";
  alertBox.hidden = false;
  void alertBox.offsetWidth;
  alertBox.classList.add(type);
}

function validateBookingForm(data) {
  const errors = {};

  if (!data.namaPemilik.trim()) {
    errors.namaPemilik = "Nama pemilik wajib diisi.";
  }

  if (!/^[0-9+\s-]{8,15}$/.test(data.noHp.trim())) {
    errors.noHp = "Masukkan nomor WhatsApp yang valid (8-15 digit).";
  }

  if (!data.namaKucing.trim()) {
    errors.namaKucing = "Nama kucing wajib diisi.";
  }

  if (!data.jenisLayanan) {
    errors.jenisLayanan = "Pilih jenis layanan.";
  }

  if (!data.tanggal) {
    errors.tanggal = "Pilih tanggal booking.";
  } else {
    const today = new Date().toISOString().split("T")[0];
    if (data.tanggal < today) {
      errors.tanggal = "Tanggal tidak boleh sebelum hari ini.";
    }
  }

  if (!data.jam) {
    errors.jam = "Pilih jam booking.";
  }

  return errors;
}

function handleFormSubmit(form) {
  const formData = new FormData(form);
  const data = {
    namaPemilik: (formData.get("namaPemilik") || "").toString(),
    noHp: (formData.get("noHp") || "").toString(),
    namaKucing: (formData.get("namaKucing") || "").toString(),
    jenisLayanan: (formData.get("jenisLayanan") || "").toString(),
    tanggal: (formData.get("tanggal") || "").toString(),
    jam: (formData.get("jam") || "").toString(),
    keterangan: (formData.get("keterangan") || "").toString(),
  };

  // Reset error lama
  ["namaPemilik", "noHp", "namaKucing", "jenisLayanan", "tanggal", "jam"].forEach((f) =>
    showFieldError(f, "")
  );

  const errors = validateBookingForm(data);
  if (Object.keys(errors).length > 0) {
    Object.entries(errors).forEach(([field, msg]) => showFieldError(field, msg));
    showAlert("Periksa kembali data yang berwarna merah di bawah ini.", "error");
    return;
  }

  const bookings = getBookings();
  const booking = {
    id: Date.now(),
    kode: nextBookingCode(bookings),
    ...data,
    createdAt: new Date().toISOString(),
  };

  bookings.push(booking);
  saveBookings(bookings);

  form.reset();
  showAlert(
    `Booking ${booking.kode} untuk ${escapeHTML(booking.namaKucing)} berhasil disimpan. Lihat di halaman Daftar Booking.`,
    "success"
  );
}

/* =================================================================
   Halaman Data (data.html)
   ================================================================= */

function initDataPage() {
  const tbody = document.getElementById("booking-tbody");
  if (!tbody) return;

  renderBookingTable();

  const clearBtn = document.getElementById("clear-all");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      if (getBookings().length === 0) return;
      openConfirmModal(
        "Hapus semua booking?",
        "Semua data booking di perangkat ini akan dihapus permanen.",
        function () {
          saveBookings([]);
          renderBookingTable();
        }
      );
    });
  }

  // Delegasi klik untuk tombol Edit & Hapus di tiap baris
  tbody.addEventListener("click", function (event) {
    const editBtn = event.target.closest(".icon-btn-edit");
    if (editBtn) {
      const id = Number(editBtn.dataset.id);
      const booking = getBookings().find((b) => b.id === id);
      if (booking) openEditModal(booking);
      return;
    }

    const deleteBtn = event.target.closest(".icon-btn-delete");
    if (deleteBtn) {
      const id = Number(deleteBtn.dataset.id);
      const row = deleteBtn.closest("tr");
      openConfirmModal(
        "Hapus booking ini?",
        "Data yang sudah dihapus tidak bisa dikembalikan.",
        function () {
          if (row) {
            // animasi keluar dulu, baru benar-benar dihapus dari localStorage
            row.classList.add("row-out");
            setTimeout(function () {
              deleteBookingById(id);
              renderBookingTable();
            }, 250);
          } else {
            deleteBookingById(id);
            renderBookingTable();
          }
        }
      );
    }
  });

  initEditModal();
  initConfirmModal();
}

function initConfirmModal() {
  const modal = document.getElementById("confirm-modal");
  if (!modal) return;
  const cancelBtn = document.getElementById("confirm-cancel");
  const okBtn = document.getElementById("confirm-ok");

  cancelBtn.addEventListener("click", function () {
    pendingConfirmAction = null;
    closeModal(modal);
  });

  okBtn.addEventListener("click", function () {
    const action = pendingConfirmAction;
    pendingConfirmAction = null;
    closeModal(modal);
    if (typeof action === "function") action();
  });

  // klik di area gelap luar kartu = batal
  modal.addEventListener("click", function (event) {
    if (event.target === modal) closeModal(modal);
  });
}

function initEditModal() {
  const modal = document.getElementById("edit-modal");
  const form = document.getElementById("edit-form");
  if (!modal || !form) return;

  const editDateInput = document.getElementById("edit-tanggal");
  if (editDateInput) {
    editDateInput.min = new Date().toISOString().split("T")[0];
  }

  document.getElementById("edit-cancel").addEventListener("click", function () {
    closeModal(modal);
  });
  document.getElementById("edit-modal-close").addEventListener("click", function () {
    closeModal(modal);
  });
  modal.addEventListener("click", function (event) {
    if (event.target === modal) closeModal(modal);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    handleEditSubmit(form);
  });
}

function openEditModal(booking) {
  const modal = document.getElementById("edit-modal");
  if (!modal) return;

  document.getElementById("edit-id").value = booking.id;
  document.getElementById("edit-namaPemilik").value = booking.namaPemilik;
  document.getElementById("edit-noHp").value = booking.noHp;
  document.getElementById("edit-namaKucing").value = booking.namaKucing;
  document.getElementById("edit-jenisLayanan").value = booking.jenisLayanan;
  document.getElementById("edit-tanggal").value = booking.tanggal;
  document.getElementById("edit-jam").value = booking.jam;
  document.getElementById("edit-keterangan").value = booking.keterangan || "";

  ["namaPemilik", "noHp", "namaKucing", "jenisLayanan", "tanggal", "jam"].forEach((f) =>
    showFieldError(f, "", "edit-")
  );
  const alertBox = document.getElementById("edit-form-alert");
  if (alertBox) alertBox.hidden = true;

  openModal(modal);
}

function handleEditSubmit(form) {
  const id = Number(document.getElementById("edit-id").value);
  const data = {
    namaPemilik: document.getElementById("edit-namaPemilik").value,
    noHp: document.getElementById("edit-noHp").value,
    namaKucing: document.getElementById("edit-namaKucing").value,
    jenisLayanan: document.getElementById("edit-jenisLayanan").value,
    tanggal: document.getElementById("edit-tanggal").value,
    jam: document.getElementById("edit-jam").value,
    keterangan: document.getElementById("edit-keterangan").value,
  };

  ["namaPemilik", "noHp", "namaKucing", "jenisLayanan", "tanggal", "jam"].forEach((f) =>
    showFieldError(f, "", "edit-")
  );

  const errors = validateBookingForm(data);
  if (Object.keys(errors).length > 0) {
    Object.entries(errors).forEach(([field, msg]) => showFieldError(field, msg, "edit-"));
    showAlert("Periksa kembali data yang berwarna merah di bawah ini.", "error", "edit-form-alert");
    return;
  }

  updateBookingById(id, data);
  closeModal(document.getElementById("edit-modal"));
  renderBookingTable();
  flashRow(id);
}

function flashRow(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;
  row.classList.add("row-flash");
  setTimeout(function () {
    row.classList.remove("row-flash");
  }, 1300);
}

function renderBookingTable() {
  const tbody = document.getElementById("booking-tbody");
  const tableWrap = document.querySelector(".table-wrap");
  const emptyState = document.getElementById("empty-state");
  const countBadge = document.getElementById("count-badge");
  if (!tbody) return;

  const bookings = getBookings().slice().reverse(); // terbaru di atas

  countBadge.textContent =
    bookings.length === 1 ? "1 booking" : `${bookings.length} booking`;
  // retrigger animasi "pop" tiap kali jumlahnya berubah
  countBadge.classList.remove("pop");
  void countBadge.offsetWidth;
  countBadge.classList.add("pop");

  if (bookings.length === 0) {
    tbody.innerHTML = "";
    if (tableWrap) tableWrap.hidden = true;
    if (emptyState) emptyState.hidden = false;
    return;
  }

  if (tableWrap) tableWrap.hidden = false;
  if (emptyState) emptyState.hidden = true;

  tbody.innerHTML = bookings
    .map(
      (b, i) => `
      <tr data-id="${b.id}" style="animation-delay:${Math.min(i * 40, 400)}ms">
        <td><span class="kode-pill">${escapeHTML(b.kode)}</span></td>
        <td>${escapeHTML(b.namaPemilik)}</td>
        <td>${escapeHTML(b.noHp)}</td>
        <td>${escapeHTML(b.namaKucing)}</td>
        <td><span class="layanan-tag">${escapeHTML(b.jenisLayanan)}</span></td>
        <td>${formatTanggalIndo(b.tanggal)}</td>
        <td>${escapeHTML(b.jam)}</td>
        <td class="col-keterangan">${b.keterangan ? escapeHTML(b.keterangan) : "&mdash;"}</td>
        <td class="col-actions">
          <button type="button" class="icon-btn icon-btn-edit" data-id="${b.id}" aria-label="Edit booking ${escapeHTML(b.kode)}">✏️ Edit</button>
          <button type="button" class="icon-btn icon-btn-delete" data-id="${b.id}" aria-label="Hapus booking ${escapeHTML(b.kode)}">🗑️ Hapus</button>
        </td>
      </tr>`
    )
    .join("");
}

/* ---------- Bootstrap ---------- */

document.addEventListener("DOMContentLoaded", function () {
  initFormPage();
  initDataPage();
});

/* =================================================================
   ANIMASI KOMPLEKS TAMBAHAN — MeowSpa Enhanced
   ================================================================= */

/* ---------- 1. Ripple effect pada semua tombol ---------- */
function initRippleEffect() {
  document.addEventListener("click", function (event) {
    const btn = event.target.closest(".btn");
    if (!btn) return;

    // Posisi klik relatif terhadap tombol
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.top = (event.clientY - rect.top) + "px";
    ripple.style.left = (event.clientX - rect.left) + "px";
    btn.appendChild(ripple);

    // Hapus element setelah animasi selesai
    setTimeout(function () { ripple.remove(); }, 650);
  });
}

/* ---------- 2. Scroll-reveal dengan IntersectionObserver ---------- */
function initScrollReveal() {
  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target); // sekali reveal cukup
        }
      });
    },
    { threshold: 0.12 }
  );

  // Tambahkan class reveal ke elemen yang belum punya animasi sendiri
  document.querySelectorAll(".section, .cta-banner").forEach(function (el) {
    el.classList.add("reveal");
    observer.observe(el);
  });

  document.querySelectorAll(".step").forEach(function (el, i) {
    el.classList.add("reveal");
    el.style.transitionDelay = (i * 0.1) + "s";
    observer.observe(el);
  });
}

/* ---------- 3. Counter animasi pada badge jumlah ---------- */
function animateCounter(el, from, to, duration) {
  if (from === to) return;
  const start = performance.now();
  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // easing ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(from + (to - from) * eased);
    el.textContent = current === 1 ? "1 booking" : current + " booking";
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* Patch renderBookingTable untuk menggunakan counter animasi */
const _origRender = renderBookingTable;
let _prevCount = 0;
renderBookingTable = function () {
  _origRender();
  const badge = document.getElementById("count-badge");
  if (badge) {
    const newCount = getBookings().length;
    animateCounter(badge, _prevCount, newCount, 500);
    _prevCount = newCount;
  }
};

/* ---------- 4. Typing indicator / placeholder animasi di form ---------- */
function initTypingPlaceholder() {
  const fields = [
    { id: "namaPemilik", hints: ["cth: Budi Santoso", "nama lengkap ya 🐱", "cth: Siti Rahayu"] },
    { id: "namaKucing",  hints: ["cth: Mochi", "cth: Oyen", "nama si bulu 🐾"] },
  ];

  fields.forEach(function (fieldConfig) {
    const input = document.getElementById(fieldConfig.id);
    if (!input || input._hintInit) return;
    input._hintInit = true;

    const hints = fieldConfig.hints;
    let hintIdx = 0;
    let charIdx = 0;
    let erasing = false;
    let intervalId = null;

    function typeHint() {
      const current = hints[hintIdx];
      if (!erasing) {
        charIdx++;
        input.placeholder = current.slice(0, charIdx);
        if (charIdx >= current.length) {
          erasing = true;
          clearInterval(intervalId);
          setTimeout(startErase, 1600);
        }
      }
    }

    function startErase() {
      intervalId = setInterval(function () {
        charIdx--;
        input.placeholder = hints[hintIdx].slice(0, charIdx);
        if (charIdx <= 0) {
          clearInterval(intervalId);
          erasing = false;
          hintIdx = (hintIdx + 1) % hints.length;
          setTimeout(startType, 400);
        }
      }, 50);
    }

    function startType() {
      intervalId = setInterval(typeHint, 60);
    }

    // Mulai saat input tidak sedang difokus
    function maybeStart() { if (document.activeElement !== input) startType(); }
    input.addEventListener("blur", function () { setTimeout(maybeStart, 200); });
    input.addEventListener("focus", function () {
      clearInterval(intervalId);
      input.placeholder = "";
    });
    setTimeout(startType, 800 + Math.random() * 400);
  });
}

/* ---------- 5. Particle burst saat booking berhasil ---------- */
function burstConfetti(originEl) {
  if (!originEl) return;
  const rect = originEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const emojis = ["🐾", "✨", "🌟", "💫", "🎉", "🐱"];
  const count = 14;

  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    el.textContent = emojis[i % emojis.length];
    el.style.cssText = `
      position: fixed;
      left: ${cx}px;
      top: ${cy}px;
      font-size: ${12 + Math.random() * 14}px;
      pointer-events: none;
      z-index: 9999;
      user-select: none;
      transform-origin: center;
      will-change: transform, opacity;
    `;
    document.body.appendChild(el);

    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const dist  = 60 + Math.random() * 90;
    const dx    = Math.cos(angle) * dist;
    const dy    = Math.sin(angle) * dist - 40; // condong ke atas
    const rot   = (Math.random() - 0.5) * 480;
    const dur   = 600 + Math.random() * 400;

    el.animate(
      [
        { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) scale(0.3) rotate(${rot}deg)`, opacity: 0 },
      ],
      { duration: dur, easing: "cubic-bezier(0.22,1,0.36,1)", fill: "forwards" }
    ).finished.then(function () { el.remove(); });
  }
}

/* Patch handleFormSubmit untuk trigger confetti */
const _origHandleSubmit = handleFormSubmit;
handleFormSubmit = function (form) {
  const bookingsBefore = getBookings().length;
  _origHandleSubmit(form);
  const bookingsAfter = getBookings().length;
  if (bookingsAfter > bookingsBefore) {
    // Booking berhasil — tembakkan partikel dari tombol submit
    const submitBtn = form.querySelector("[type=submit]");
    burstConfetti(submitBtn);
  }
};

/* ---------- 6. Hover tilt 3D untuk service cards ---------- */
function initTilt3D() {
  document.querySelectorAll(".service-card").forEach(function (card) {
    card.addEventListener("mousemove", function (e) {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;  // -0.5 .. 0.5
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.transform = `
        translateY(-6px) scale(1.02)
        rotateX(${-y * 10}deg)
        rotateY(${x * 10}deg)
      `;
    });

    card.addEventListener("mouseleave", function () {
      card.style.transition = "transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease";
      card.style.transform = "";
      setTimeout(function () { card.style.transition = ""; }, 400);
    });

    card.style.transformStyle   = "preserve-3d";
    card.style.willChange       = "transform";
    card.style.perspective      = "800px";
  });
}

/* ---------- 7. Nav link — active highlight saat scroll ---------- */
function initNavHighlight() {
  // hanya relevan di halaman yang punya banyak section
  const sections = document.querySelectorAll("section[id]");
  if (sections.length === 0) return;

  const navLinks = document.querySelectorAll(".nav-link");
  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(function (link) {
            link.classList.toggle(
              "is-active",
              link.getAttribute("href") === "#" + id
            );
          });
        }
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  sections.forEach(function (s) { observer.observe(s); });
}

/* ---------- 8. Smooth loading skeleton sebelum tabel muncul ---------- */
function showTableSkeleton() {
  const tbody = document.getElementById("booking-tbody");
  if (!tbody) return;

  const skeletonRow = function (delay) {
    return `<tr style="animation-delay:${delay}ms">
      <td><div style="height:16px;width:70px;background:linear-gradient(90deg,#eee 25%,#f5f5f5 50%,#eee 75%);background-size:200%;animation:shine-sweep 1.2s infinite;border-radius:4px;"></div></td>
      <td><div style="height:16px;width:110px;background:linear-gradient(90deg,#eee 25%,#f5f5f5 50%,#eee 75%);background-size:200%;animation:shine-sweep 1.2s infinite;border-radius:4px;"></div></td>
      <td colspan="6"><div style="height:16px;background:linear-gradient(90deg,#eee 25%,#f5f5f5 50%,#eee 75%);background-size:200%;animation:shine-sweep 1.2s infinite;border-radius:4px;"></div></td>
    </tr>`;
  };
  tbody.innerHTML = [0, 80, 160].map(skeletonRow).join("");
}

/* ---------- Bootstrap semua animasi tambahan ---------- */
document.addEventListener("DOMContentLoaded", function () {
  initRippleEffect();
  initScrollReveal();
  initTypingPlaceholder();
  initTilt3D();
  initNavHighlight();

  // Skeleton sebentar sebelum data muncul (hanya di halaman data)
  const tbody = document.getElementById("booking-tbody");
  if (tbody) {
    showTableSkeleton();
    setTimeout(renderBookingTable, 320);
  }
});
