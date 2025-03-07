// table.js
export function styleTable(htmlString) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;
  const table = tempDiv.querySelector('table');
  if (table) {
    // Apply Bootstrap classes for overall table styling.
    table.classList.add('table', 'table-striped', 'table-hover', 'table-bordered');

    // Try to get header cells from a <thead>.
    let headerCells = table.querySelectorAll('thead th');
    
    if (headerCells.length === 0) {
      // Fallback: assume the first row in the table is the header row.
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        headerCells = firstRow.querySelectorAll('td, th');
      }
    }
    
    headerCells.forEach((cell, index) => {
      cell.style.border = '1px solid #dee2e6';
      cell.style.padding = '8px';
      cell.style.textAlign = 'center';
      
      if (index === 0) {
        // First header cell: prevent wrapping.
        cell.style.whiteSpace = 'nowrap';
      } else {
        // Rotate other header cells by -45°.
        cell.style.transform = 'rotate(-45deg)';
        cell.style.transformOrigin = 'bottom left';
        // Force inline-block display to ensure the transform takes effect.
        cell.style.display = 'inline-block';
        // Increase the height to accommodate rotated text.
        cell.style.height = '80px';
      }
    });

    // Also ensure that the first cell in each data row does not wrap.
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
