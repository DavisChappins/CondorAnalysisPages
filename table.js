// table.js
export function styleTable(htmlString) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;
  const table = tempDiv.querySelector('table');
  if (table) {
    // Apply Bootstrap classes
    table.classList.add('table', 'table-striped', 'table-hover', 'table-bordered');
    // Example: set header background and font weight
    const ths = table.querySelectorAll('th');
    ths.forEach(th => {
      th.style.backgroundColor = '#f8f9fa';
      th.style.fontWeight = 'bold';
      th.style.padding = '8px';
    });
    // Example: set cell padding and border color
    const tds = table.querySelectorAll('td');
    tds.forEach(td => {
      td.style.padding = '8px';
      td.style.borderColor = '#dee2e6';
    });
    // You can also adjust column widths manually if needed:
    // For instance, if you know the desired widths:
    // table.querySelectorAll('th:nth-child(1)').forEach(th => { th.style.width = '150px'; });
  }
  return tempDiv.innerHTML;
}
