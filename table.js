// table.js

// Helper functions for color interpolation.
function interpolateColor(color1, color2, fraction) {
  const r = Math.round(color1.r + (color2.r - color1.r) * fraction);
  const g = Math.round(color1.g + (color2.g - color1.g) * fraction);
  const b = Math.round(color1.b + (color2.b - color1.b) * fraction);
  return { r, g, b };
}

function rgbToHex(color) {
  return '#' + [color.r, color.g, color.b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Apply conditional formatting for a given column.
 * @param {HTMLTableElement} table - The table element.
 * @param {string} headerName - The header name to match (case-insensitive).
 * @param {string} scale - Either "red_to_green" (default) or "green_to_red".
 */
function applyConditionalFormattingForColumn(table, headerName, scale = "red_to_green") {
  if (!table) return;
  // Find header row (prefer <thead>, otherwise first row).
  let headerRow = table.querySelector('thead tr') || table.rows[0];
  if (!headerRow) return;
  const headerCells = Array.from(headerRow.cells);
  const colIndex = headerCells.findIndex(cell =>
    cell.textContent.trim().toLowerCase() === headerName.toLowerCase()
  );
  if (colIndex === -1) return; // Column not found

  // Collect numeric values from data rows (skip header row).
  let values = [];
  for (let i = 1; i < table.rows.length; i++) {
    const cell = table.rows[i].cells[colIndex];
    if (cell) {
      const val = parseFloat(cell.textContent);
      if (!isNaN(val)) {
        values.push(val);
      }
    }
  }
  if (values.length === 0) return;

  // Compute min, median, and max.
  const sorted = values.slice().sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  let median;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    median = (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    median = sorted[mid];
  }

  // Set colors based on the chosen scale.
  let startColor, midColor, endColor;
  if (scale === "green_to_red") {
    startColor = { r: 99, g: 190, b: 123 };   // green (#63BE7B) for minimum
    midColor   = { r: 255, g: 255, b: 255 };   // white for median
    endColor   = { r: 248, g: 105, b: 107 };    // red (#F8696B) for maximum
  } else { // default "red_to_green"
    startColor = { r: 248, g: 105, b: 107 };    // red (#F8696B) for minimum
    midColor   = { r: 255, g: 255, b: 255 };    // white for median
    endColor   = { r: 99, g: 190, b: 123 };     // green (#63BE7B) for maximum
  }

  // Apply formatting to each data cell in the column.
  for (let i = 1; i < table.rows.length; i++) {
    const cell = table.rows[i].cells[colIndex];
    if (cell) {
      const val = parseFloat(cell.textContent);
      if (!isNaN(val)) {
        let color;
        if (val <= median) {
          const fraction = (median - min) === 0 ? 0 : (val - min) / (median - min);
          color = interpolateColor(startColor, midColor, fraction);
        } else {
          const fraction = (max - median) === 0 ? 0 : (val - median) / (max - median);
          color = interpolateColor(midColor, endColor, fraction);
        }
        cell.style.backgroundColor = rgbToHex(color);
      }
    }
  }
}

export function styleTable(htmlString) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;
  const table = tempDiv.querySelector('table');
  if (table) {
    // Apply Bootstrap classes for overall styling (including small margins).
    table.classList.add('table', 'table-sm', 'table-striped', 'table-hover', 'table-bordered');

    // Get header cells – first try <thead> then fall back to first row.
    let headerCells = table.querySelectorAll('thead th');
    if (!headerCells.length) {
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        headerCells = firstRow.querySelectorAll('td, th');
      }
    }

    // Wrap each header cell’s content in a rotated container.
    headerCells.forEach(cell => {
      const innerDiv = document.createElement('div');
      innerDiv.innerHTML = cell.innerHTML;
      innerDiv.style.display = 'inline-block';
      innerDiv.style.transform = 'rotate(-45deg)';
      innerDiv.style.transformOrigin = 'bottom left';
      innerDiv.style.padding = '2px';
      cell.innerHTML = '';
      cell.appendChild(innerDiv);
      cell.style.padding = '2px 8px';
      cell.style.textAlign = 'center';
      cell.style.verticalAlign = 'bottom';
      cell.style.border = '1px solid #dee2e6';
    });

    // Ensure first column cells (both header and data) do not wrap.
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      const firstCell = row.cells[0];
      if (firstCell) {
        firstCell.style.whiteSpace = 'nowrap';
      }
    });

    // Apply conditional formatting on desired columns.
    applyConditionalFormattingForColumn(table, "Rule1_glide_ratio", "red_to_green");
    applyConditionalFormattingForColumn(table, "Rule1_avg_glide_netto_kt", "red_to_green");
    applyConditionalFormattingForColumn(table, "Rule2_avg_climb_rate_kts", "red_to_green");
    applyConditionalFormattingForColumn(table, "Glide L/D", "red_to_green");
    applyConditionalFormattingForColumn(table, "Avg Netto (kts)", "red_to_green");
    applyConditionalFormattingForColumn(table, "Avg Climb (kts)", "red_to_green");

    applyConditionalFormattingForColumn(table, "Deviation Flown (%)", "green_to_red");
    applyConditionalFormattingForColumn(table, "Rule3_total_glide_more_percent", "green_to_red");
  }
  return tempDiv.innerHTML;
}

export function adjustColumnWidths(table) {
  if (!table) return;
  // Find the last row in the table.
  const lastRow = table.querySelector('tr:last-child');
  if (!lastRow) return;
  const cells = lastRow.cells;
  const numCols = cells.length;

  // Create or get a <colgroup> at the top of the table.
  let colgroup = table.querySelector('colgroup');
  if (!colgroup) {
    colgroup = document.createElement('colgroup');
    table.insertBefore(colgroup, table.firstChild);
  }
  colgroup.innerHTML = '';

  // For each column, create a <col> element.
  for (let i = 0; i < numCols; i++) {
    const col = document.createElement('col');
    if (i > 0) { // For columns 2 through n, use the width from the last row cell.
      const cellWidth = cells[i].offsetWidth;
      col.style.width = cellWidth + 'px';
    }
    colgroup.appendChild(col);
  }
}
