const { generujMiesiac } = require('./generuj_miesiac');
const { sendTelegramMessage } = require('./notify_telegram');

const POLSKIE_MIESIACE = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
];

async function main() {
  const now = new Date();
  // Jeśli uruchamiamy cronem pod koniec miesiąca (np. po 20. dniu), celem jest kolejny miesiąc
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const targetName = `${POLSKIE_MIESIACE[nextMonthDate.getMonth()]}_${nextMonthDate.getFullYear()}`;

  console.log(`[Autogenerator] Sprawdzanie i przygotowywanie grafiku dla: ${targetName}...`);

  try {
    const res = await generujMiesiac(targetName);
    console.log('[Autogenerator] Wynik:', res);

    if (res && res.sukces) {
      const msg = `📅 <b>Automatyczne generowanie nowego miesiąca!</b>\n\n` +
        `✅ Utworzono grafik na miesiąc: <b>${res.docId}</b>\n` +
        `Rotacja grup niedzielnych i dyżury zostały pomyślnie przeniesione.`;
      await sendTelegramMessage(msg);
    } else {
      console.log(`[Autogenerator] Informacja: ${res.wiadomosc || 'Miesiąc już istnieje.'}`);
    }
  } catch (err) {
    console.error('[Autogenerator] Błąd:', err);
    await sendTelegramMessage(`❌ <b>Błąd generowania nowego miesiąca (${targetName}):</b> ${err.message}`);
    process.exit(1);
  }
}

main();
