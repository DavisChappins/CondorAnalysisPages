// table.js
export function styleTable(htmlString) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;
  const table = tempDiv.querySelector('table');
  if (table) {
    // Apply Bootstrap classes for overall table styling.
    table.classList.add('table', 'table-striped', 'table-hover', 'table-bordered');

    // Process each header cell.
    const headerCells = table.querySelectorAll('th');
    headerCells.forEach((th, index) => {
      // Common header styling.
      th.style.border = '1px solid #dee2e6';
      th.style.padding = '8px';
      th.style.textAlign = 'center';
      
      if (index === 0) {
        // First column auto-sizes by preventing wrapping.
        th.style.whiteSpace = 'nowrap';
      } else {
        // Rotate the header text for all columns after the first.
        th.style.transform = 'rotate(-45deg)';
        th.style.transformOrigin = 'bottom left';
        // Increase the height to accommodate rotated text.
        th.style.height = '80px';
      }
    });

    // Optional: If you want to set column widths explicitly, you can add code here.
  }
  return tempDiv.innerHTML;
}
