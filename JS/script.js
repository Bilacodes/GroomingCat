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
   Halaman Form (index.html)
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

function showFieldError(name, message) {
  const el = document.querySelector(`.field-error[data-for="${name}"]`);
  if (el) el.textContent = message || "";
}

function showAlert(message, type) {
  const alertBox = document.getElementById("form-alert");
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
      <tr style="animation-delay:${Math.min(i * 40, 400)}ms">
        <td><span class="kode-pill">${escapeHTML(b.kode)}</span></td>
        <td>${escapeHTML(b.namaPemilik)}</td>
        <td>${escapeHTML(b.noHp)}</td>
        <td>${escapeHTML(b.namaKucing)}</td>
        <td><span class="layanan-tag">${escapeHTML(b.jenisLayanan)}</span></td>
        <td>${formatTanggalIndo(b.tanggal)}</td>
        <td>${escapeHTML(b.jam)}</td>
        <td class="col-keterangan">${b.keterangan ? escapeHTML(b.keterangan) : "&mdash;"}</td>
      </tr>`
    )
    .join("");
}

/* ---------- Bootstrap ---------- */

document.addEventListener("DOMContentLoaded", function () {
  initFormPage();
  initDataPage();
});
