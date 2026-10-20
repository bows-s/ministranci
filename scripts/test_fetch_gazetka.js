async function test() {
  try {
    const res = await fetch("https://jozef.tgory.pl/gazetka");
    const html = await res.text();
    const rowRegex = /<div class="gazetka-row">([\s\S]*?)<\/div>\s*<\/div>/g;
    let match;
    const items = [];
    while ((match = rowRegex.exec(html)) !== null) {
      const chunk = match[1];
      const dateMatch = chunk.match(/<span class="gazetka-row-date">([^<]+)<\/span>/);
      const pdfMatch = chunk.match(/href="([^"]+\.pdf)"/);
      if (dateMatch && pdfMatch) {
        items.push({ date: dateMatch[1].trim(), url: pdfMatch[1] });
      }
    }
    console.log("Znaleziono gazetek:", items.length);
    items.forEach(it => console.log(it.date, "->", it.url));
  } catch (err) {
    console.error("Błąd fetch:", err);
  }
}
test();
