// table.js
export function styleTable(htmlString) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;
  const table = tempDiv.querySelector('table');
  if (table) {
    table.classList.add('table', 'table-striped', 'table-hover', 'table-bordered');
  }
  return tempDiv.innerHTML;
}
