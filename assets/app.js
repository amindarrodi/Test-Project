const fa = new Intl.NumberFormat('fa-IR', {maximumFractionDigits: 2});
const $ = (selector) => document.querySelector(selector);
let rates = null;
const isPreview = document.documentElement.dataset.preview === 'true';
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
async function previewRates() {
  // GitHub Pages cannot execute PHP, so the preview uses the same public sources directly.
  const [fxResponse, goldResponse] = await Promise.all([
    fetch('https://open.er-api.com/v6/latest/USD', {cache:'no-store'}),
    fetch('https://api.gold-api.com/price/XAU', {cache:'no-store'}).catch(() => null)
  ]);
  if (!fxResponse.ok) throw new Error('unavailable');
  const fx = await fxResponse.json();
  const irr = Number(fx.rates?.IRR), eur = Number(fx.rates?.EUR);
  if (!Number.isFinite(irr) || irr <= 0 || !Number.isFinite(eur) || eur <= 0) throw new Error('invalid rates');
  let xau = null;
  if (goldResponse?.ok) {
    try { const gold = await goldResponse.json(); const price = Number(gold.price); if (Number.isFinite(price) && price > 0) xau = price; } catch (_) {}
  }
  const usd = irr / 10;
  return {fetched_at: Math.floor(Date.now() / 1000), stale: false,
    rates: {USD: usd, EUR: usd / eur, XAU: xau, GOLD: xau === null ? null : xau / 31.1034768 * 0.75 * usd}};
}
async function loadRates() {
  const refresh = $('#refresh'); refresh.classList.add('spinning'); $('#update-label').textContent = 'در حال دریافت اطلاعات...';
  try {
    let data;
    if (isPreview) { data = await previewRates(); }
    else {
      const response = await fetch('api/rates.php', {cache:'no-store'});
      data = await response.json();
      if (!response.ok || !data.rates) throw new Error('unavailable');
    }
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
