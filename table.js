// table.js
export function styleTable(htmlString) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;
  const table = tempDiv.querySelector('table');
  if (table) {
    // Apply Bootstrap classes for overall table styling.
    table.classList.add('table', 'table-striped', 'table-hover', 'table-bordered');

    // Process header cells.
    const headerCells = table.querySelectorAll('th');
    headerCells.forEach((th, index) => {
      th.style.border = '1px solid #dee2e6';
      th.style.padding = '8px';
      th.style.textAlign = 'center';
      
      if (index === 0) {
        // First header cell: prevent wrapping.
        th.style.whiteSpace = 'nowrap';
      } else {
        // Rotate remaining header cells by -45° (counterclockwise).
        th.style.transform = 'rotate(-45deg)';
        th.style.transformOrigin = 'bottom left';
        // Increase height to accommodate rotated text.
        th.style.height = '80px';
      }
    });

    // Process each row: ensure the first cell doesn't wrap.
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      // row.cells[0] gets the first cell (either <th> or <td>).
      const firstCell = row.cells[0];
      if (firstCell) {
        firstCell.style.whiteSpace = 'nowrap';
      }
    });
  }
  return tempDiv.innerHTML;
}
