const fa = new Intl.NumberFormat('fa-IR', {maximumFractionDigits: 2});
const $ = (selector) => document.querySelector(selector);
let rates = null;
const labels = {USD:'دلار', EUR:'یورو', IRT:'تومان'};
$('#today').textContent = new Intl.DateTimeFormat('fa-IR', {weekday:'long', year:'numeric', month:'long', day:'numeric'}).format(new Date());
function format(n) { return fa.format(n); }
function convert() {
  const input = $('#amount').value.replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[,٬\s]/g, '').replace('٫','.');
  const amount = Number(input), from = $('#from').value, to = $('#to').value;
  $('#result-unit').textContent = labels[to];
  if (!rates || !input || !Number.isFinite(amount) || amount < 0) { $('#result').textContent = '—'; $('#conversion-note').textContent = rates ? 'مبلغ معتبر وارد کنید' : 'در انتظار دریافت نرخ مرجع'; return; }
  const values = {IRT: 1, USD: rates.USD, EUR: rates.EUR};
  $('#result').textContent = format(amount * values[from] / values[to]);
  $('#conversion-note').textContent = `هر ۱ ${labels[from]} برابر با ${format(values[from] / values[to])} ${labels[to]}`;
}
async function loadRates() {
  const refresh = $('#refresh'); refresh.classList.add('spinning'); $('#update-label').textContent = 'در حال دریافت اطلاعات...';
  try {
    const response = await fetch('api/rates.php', {cache:'no-store'});
    const data = await response.json();
    if (!response.ok || !data.rates) throw new Error('unavailable');
    rates = data.rates;
    document.querySelectorAll('[data-rate]').forEach(el => { const value = rates[el.dataset.rate]; el.textContent = typeof value === 'number' ? format(value) : 'ناموجود'; });
    const date = new Date(data.fetched_at * 1000);
    $('#update-label').textContent = (data.stale ? 'آخرین اطلاعات ذخیره‌شده: ' : 'دریافت اطلاعات: ') + new Intl.DateTimeFormat('fa-IR', {hour:'2-digit', minute:'2-digit', day:'numeric', month:'short'}).format(date);
    $('.status-dot').classList.toggle('stale', data.stale);
    convert();
  } catch (error) { $('#update-label').textContent = 'دریافت نرخ ناموفق بود؛ دوباره تلاش کنید'; $('.status-dot').classList.add('stale'); }
  finally { refresh.classList.remove('spinning'); }
}
$('#refresh').addEventListener('click', loadRates);
['amount','from','to'].forEach(id => $('#'+id).addEventListener(id === 'amount' ? 'input' : 'change', convert));
$('#swap').addEventListener('click', () => { const old = $('#from').value; $('#from').value = $('#to').value; $('#to').value = old; convert(); });
function openMap(query) { window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query), '_blank', 'noopener,noreferrer'); }
$('#exchange-form').addEventListener('submit', e => { e.preventDefault(); const q = $('#exchange-query').value.trim(); if (q) openMap(q.includes('صرافی') ? q : 'صرافی مجاز ' + q); });
document.querySelectorAll('[data-query]').forEach(button => button.addEventListener('click', () => openMap(button.dataset.query)));
loadRates(); setInterval(loadRates, 300000);
