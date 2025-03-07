// table.js
export function styleTable(htmlString) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;
  const table = tempDiv.querySelector('table');
  if (table) {
    // Apply Bootstrap classes for overall styling.
    table.classList.add('table', 'table-striped', 'table-hover', 'table-bordered');

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
      // Create a wrapper div and move existing content into it.
      const innerDiv = document.createElement('div');
      innerDiv.innerHTML = cell.innerHTML;
      // Rotate the inner container.
      innerDiv.style.display = 'inline-block';
      innerDiv.style.transform = 'rotate(-45deg)';
      innerDiv.style.transformOrigin = 'bottom left';
      // Adjust the padding in the rotated container as needed.
      innerDiv.style.padding = '2px';
      // Clear cell content and insert the wrapper.
      cell.innerHTML = '';
      cell.appendChild(innerDiv);
      // Adjust the cell’s own styling.
      cell.style.padding = '2px 8px';   // Adjust vertical/horizontal spacing here.
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
  // Clear any existing <col> elements.
  colgroup.innerHTML = '';

  // For each column, create a <col> element.
  for (let i = 0; i < numCols; i++) {
    const col = document.createElement('col');
    if (i > 0) { // For columns 2 through n, use the width from the last row cell.
      // Use offsetWidth (a rendered pixel value) from the last row cell.
      const cellWidth = cells[i].offsetWidth;
      col.style.width = cellWidth + 'px';
    }
    colgroup.appendChild(col);
  }
}
