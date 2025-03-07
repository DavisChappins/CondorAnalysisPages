// table.js
export function styleTable(htmlString) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;
  const table = tempDiv.querySelector('table');
  if (table) {
    // Apply Bootstrap classes for overall table styling.
    table.classList.add('table', 'table-striped', 'table-hover', 'table-bordered');

    // Get header cells. Prefer headers in a <thead> if available.
    let headerCells = table.querySelectorAll('thead th');
    if (!headerCells.length) {
      // Fallback: assume the first row is the header.
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        headerCells = firstRow.querySelectorAll('td, th');
      }
    }

    // For each header cell, wrap its content in a rotated container.
    headerCells.forEach(cell => {
      // Create a wrapper div and move the existing content into it.
      const innerDiv = document.createElement('div');
      innerDiv.innerHTML = cell.innerHTML;
      
      // Apply rotation to the inner container.
      innerDiv.style.display = 'inline-block';
      innerDiv.style.transform = 'rotate(-45deg)';
      innerDiv.style.transformOrigin = 'bottom left';
      // Adjust padding inside the rotated container to control spacing.
      innerDiv.style.padding = '2px';
      
      // Clear the cell and insert the rotated wrapper.
      cell.innerHTML = '';
      cell.appendChild(innerDiv);
      
      // Adjust the cell's own styling.
      cell.style.padding = '2px 8px';   // Adjust vertical/horizontal padding as needed.
      cell.style.textAlign = 'center';
      cell.style.verticalAlign = 'bottom';
      cell.style.border = '1px solid #dee2e6';
    });

    // Ensure that the first cell in each row does not wrap.
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
