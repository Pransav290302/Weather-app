import PDFDocument from "pdfkit";
import { stringify } from "csv-stringify";

export function exportAsJson(response, records) {
  response.setHeader("Content-Type", "application/json");
  response.send(JSON.stringify(records, null, 2));
}

export function exportAsCsv(response, records) {
  response.setHeader("Content-Type", "text/csv");

  const csvStream = stringify({
    header: true,
    columns: [
      "id",
      "original_input",
      "resolved_name",
      "latitude",
      "longitude",
      "start_date",
      "end_date",
      "created_at",
      "daily_json"
    ]
  });

  csvStream.pipe(response);

  records.forEach(record => csvStream.write(record));
  csvStream.end();
}

export function exportAsMarkdown(response, records) {
  response.setHeader("Content-Type", "text/markdown");

  const markdownLines = ["# Weather Queries\n"];

  for (const record of records) {
    markdownLines.push(`## #${record.id} — ${record.resolved_name || record.original_input}`);
    markdownLines.push(`- Dates: ${record.start_date} → ${record.end_date}`);
    markdownLines.push(`- Coords: ${record.latitude?.toFixed(4)}, ${record.longitude?.toFixed(4)}`);
    markdownLines.push("");
  }

  response.send(markdownLines.join("\n"));
}

export function exportAsPdf(response, records) {
  response.setHeader("Content-Type", "application/pdf");

  const pdfDocument = new PDFDocument({ margin: 36 });
  pdfDocument.pipe(response);

  pdfDocument.fontSize(18).text("Weather Queries", { underline: true });
  pdfDocument.moveDown(0.5);

  records.forEach(record => {
    pdfDocument.fontSize(12).text(`#${record.id} — ${record.resolved_name || record.original_input}`);
    pdfDocument.text(`Dates: ${record.start_date} → ${record.end_date}`);
    pdfDocument.text(`Coords: ${Number(record.latitude).toFixed(4)}, ${Number(record.longitude).toFixed(4)}`);

    try {
      const dailyData = JSON.parse(record.daily_json || "[]");
      dailyData.slice(0, 10).forEach(day => {
        pdfDocument.text(`  ${day.date}: min ${Math.round(day.tmin)}° / max ${Math.round(day.tmax)}°`);
      });
    } catch {}

    pdfDocument.moveDown(0.5);
  });

  pdfDocument.end();
}