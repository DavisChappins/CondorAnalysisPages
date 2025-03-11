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
    midColor   = { r: 255, g: 255, b: 255 };   // white for median
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

// Global variable to store definitions data
let definitionsData = null;

// Function to load definitions from JSON file
async function loadDefinitions() {
  try {
    // Use absolute path relative to server root
    const response = await fetch('/definitions.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    definitionsData = await response.json();
    console.log('Definitions loaded successfully');
    return definitionsData;
  } catch (error) {
    console.error('Error loading definitions:', error);
    return null;
  }
}

// Load definitions when the script loads
document.addEventListener('DOMContentLoaded', function() {
  loadDefinitions();
});

// Get tooltip content for a header
function getTooltipContent(headerText) {
  if (!definitionsData) {
    console.error('Definitions data not loaded when getting tooltip for:', headerText);
    return null;
  }
  
  // Clean up header text to match keys in definitions.json
  const cleanHeader = headerText.trim();
  console.log('Getting tooltip for header:', cleanHeader);
  
  const columnInfo = definitionsData.columns[cleanHeader];
  if (!columnInfo) {
    console.warn('No definition found for column:', cleanHeader);
    // For debugging, list all available keys
    console.log('Available keys:', Object.keys(definitionsData.columns));
    return null;
  }
  
  let tooltipContent = `<strong>${cleanHeader}</strong><br>${columnInfo.definition}`;
  
  // Add rule information if applicable
  if (columnInfo.rule && definitionsData.rules[columnInfo.rule]) {
    const ruleNumber = columnInfo.rule.replace('rule', '');
    tooltipContent += `<br><br><strong>Rule ${ruleNumber}:</strong> ${definitionsData.rules[columnInfo.rule]}`;
  }
  
  return tooltipContent;
}

export function styleTable(htmlString) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;
  const table = tempDiv.querySelector('table');
  if (table) {
    // Apply Bootstrap classes for overall styling
    table.classList.add('table', 'table-sm', 'table-striped', 'table-hover', 'table-bordered');
    
    // Set table to have a compact layout that truly fits content
    table.style.tableLayout = 'auto'; 
    table.style.width = 'max-content';
    table.style.fontSize = '0.9rem';
    table.style.borderSpacing = '0';
    table.style.borderCollapse = 'collapse';
    table.style.marginLeft = '20px'; // Add left margin to the table
    
    // Add custom CSS for better hover effect and tooltips
    const style = document.createElement('style');
    style.textContent = `
      .table-hover tbody tr:hover {
        background-color: #c2e0ff !important; /* Brighter blue highlight */
      }
      .table-striped tbody tr:nth-of-type(odd) {
        background-color: rgba(0, 0, 0, 0.03); /* Very light grey for striping */
      }
      .tooltip-inner {
        max-width: 300px;
        text-align: left;
        padding: 8px;
      }
      .numeric-cell {
        text-align: right;
        white-space: nowrap;
        width: auto !important;
        min-width: 0 !important;
        max-width: none !important;
        padding-left: 5px;
        padding-right: 5px;
      }
      .text-cell {
        text-align: left;
        white-space: nowrap;
        min-width: 0 !important;
        max-width: none !important;
        padding-left: 5px;
        padding-right: 5px;
      }
    `;
    document.head.appendChild(style);
    
    // Global style for all table cells - minimal padding
    const allCells = table.querySelectorAll('td, th');
    allCells.forEach(cell => {
      cell.style.padding = '1px 5px'; // Increased horizontal padding to 5px
      cell.style.verticalAlign = 'middle';
      cell.style.fontSize = '0.9rem';
      cell.style.lineHeight = '1';
      cell.style.width = 'auto'; // Let content determine width
    });
    
    // Analyze which columns contain text vs. numbers
    const rows = table.querySelectorAll('tr');
    const numRows = rows.length;
    const numCols = rows.length > 0 ? rows[0].cells.length : 0;
    const colTypes = new Array(numCols).fill('numeric'); // Assume numeric by default
    
    // Determine column types by checking first few data rows
    const samplesToCheck = Math.min(5, numRows - 1);
    for (let c = 0; c < numCols; c++) {
      let textCount = 0;
      for (let r = 1; r <= samplesToCheck; r++) {
        if (r < numRows && c < rows[r].cells.length) {
          const content = rows[r].cells[c].textContent.trim();
          // If not a number, mark as text column
          if (isNaN(parseFloat(content)) || !isFinite(content)) {
            textCount++;
          }
        }
      }
      // If more than half samples are text, consider it a text column
      if (textCount > samplesToCheck / 2) {
        colTypes[c] = 'text';
      }
    }
    
    // Apply styles based on column type
    for (let r = 1; r < numRows; r++) {
      const row = rows[r];
      for (let c = 0; c < row.cells.length; c++) {
        const cell = row.cells[c];
        const content = cell.textContent.trim();
        
        if (colTypes[c] === 'text' || (isNaN(parseFloat(content)) || !isFinite(content))) {
          // Text styling
          cell.classList.add('text-cell');
          cell.style.padding = '1px 5px'; // Force padding override
        } else {
          // Numeric styling - ultra compact
          cell.classList.add('numeric-cell');
          cell.style.padding = '1px 5px'; // Force padding override
        }
      }
    }
    
    // Now handle the header cells
    let headerCells = table.querySelectorAll('thead th');
    if (!headerCells.length) {
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        headerCells = firstRow.querySelectorAll('td, th');
      }
    }

    // Apply header styling
    headerCells.forEach((cell, index) => {
      // Store the original text for tooltip
      const headerText = cell.textContent;
      
      // Add tooltip attributes
      cell.setAttribute('data-toggle', 'tooltip');
      cell.setAttribute('data-html', 'true');
      cell.setAttribute('data-original-text', headerText);
      const tooltipContent = getTooltipContent(headerText);
      if (tooltipContent) {
        cell.setAttribute('title', tooltipContent);
      }
      
      // For all headers, use rotated text
      const text = cell.textContent;
      cell.innerHTML = '';
      cell.style.position = 'relative';
      cell.style.height = '90px';
      cell.style.width = 'auto';
      cell.style.overflow = 'visible';
      
      const div = document.createElement('div');
      div.textContent = text;
      div.style.position = 'absolute';
      div.style.transformOrigin = 'left bottom';
      div.style.transform = 'rotate(-45deg)';
      div.style.whiteSpace = 'nowrap';
      div.style.fontSize = '0.9rem';
      div.style.bottom = '2px';
      div.style.left = '10px'; // Changed from 4px to 10px for better spacing
      div.style.width = 'auto';
      div.style.overflow = 'visible'; // Allow text to overflow its container
      div.style.zIndex = '1';         // Ensure it appears above other content
      
      cell.appendChild(div);
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

    // Format rank column values to display as integers (i.e. without a decimal point)
    const rankHeaderNames = ['rank', 'nk'];
    headerCells.forEach((cell, colIndex) => {
      const headerText = (cell.getAttribute('data-original-text') || cell.textContent).trim().toLowerCase();
      if (rankHeaderNames.includes(headerText)) {
        // Found the rank column. Process each data row in that column.
        for (let r = 1; r < rows.length; r++) {
          const dataCell = rows[r].cells[colIndex];
          if (dataCell) {
            const num = parseFloat(dataCell.textContent);
            if (!isNaN(num)) {
              // Set the text content to the integer value (e.g., 1 instead of 1.0)
              dataCell.textContent = parseInt(num, 10).toString();
            }
          }
        }
      }
    });
    
    // Find the index of the "Name" column first
    let nameColumnIndex = -1;
    const headerRow = table.rows[0];
    for (let i = 0; i < headerRow.cells.length; i++) {
      const headerText = headerRow.cells[i].textContent.trim().toLowerCase();
      const origText = headerRow.cells[i].getAttribute('data-original-text');
      const textToCheck = (origText || headerText).toLowerCase();
      if (textToCheck === 'name' || textToCheck === 'pilot' || textToCheck === 'competitor') {
        nameColumnIndex = i;
        break;
      }
    }
    
    // Store the final nameColumnIndex value for use in event handlers
    const finalNameColumnIndex = nameColumnIndex;
    
    // Add column highlighting that preserves the original background colors
    for (let i = 0; i < table.rows.length; i++) {
      const row = table.rows[i];
      for (let j = 0; j < row.cells.length; j++) {
        const cell = row.cells[j];
        
        // Store the original background on mouseover and apply a blue tint
        cell.setAttribute('onmouseover', `
          // Store original colors for the column
          for (let r = 0; r < this.parentNode.parentNode.rows.length; r++) {
            if (this.parentNode.parentNode.rows[r].cells[${j}]) {
              const cell = this.parentNode.parentNode.rows[r].cells[${j}];
              // Only store original color if not already stored
              if (!cell.hasAttribute('data-original-bg')) {
                cell.setAttribute('data-original-bg', cell.style.backgroundColor || '');
              }
              // Apply a semi-transparent blue tint
              cell.style.boxShadow = 'inset 0 0 0 1000px rgba(30, 144, 255, 0.3)';
              
              // Make header text bold if this is the header row (r=0)
              if (r === 0) {
                // Find the div inside the header cell that contains the text
                const textDiv = cell.querySelector('div');
                if (textDiv) {
                  // Store original font weight
                  if (!textDiv.hasAttribute('data-original-weight')) {
                    textDiv.setAttribute('data-original-weight', textDiv.style.fontWeight || 'normal');
                  }
                  // Make text bold
                  textDiv.style.fontWeight = 'bold';
                }
              }
            }
          }
        `);
        
        // Restore the original background on mouseout
        cell.setAttribute('onmouseout', `
          for (let r = 0; r < this.parentNode.parentNode.rows.length; r++) {
            if (this.parentNode.parentNode.rows[r].cells[${j}]) {
              const cell = this.parentNode.parentNode.rows[r].cells[${j}];
              // Remove the blue tint
              cell.style.boxShadow = '';
              
              // Restore the header font weight if this is the header row
              if (r === 0) {
                const textDiv = cell.querySelector('div');
                if (textDiv) {
                  textDiv.style.fontWeight = textDiv.getAttribute('data-original-weight') || 'normal';
                }
              }
            }
          }
        `);
      }
    }
    
    // Add row highlighting enhancement (underline text in name column) 
    if (finalNameColumnIndex !== -1) {
      for (let i = 1; i < table.rows.length; i++) {
        const row = table.rows[i];
        
        // Add mouseover event to underline name cell when row is hovered
        row.setAttribute('onmouseover', `
          // Find the name cell in this row
          if (this.cells[${finalNameColumnIndex}]) {
            const nameCell = this.cells[${finalNameColumnIndex}];
            // Store original text decoration
            if (!nameCell.hasAttribute('data-original-decoration')) {
              nameCell.setAttribute('data-original-decoration', nameCell.style.textDecoration || 'none');
            }
            // Add underline (doesn't change width)
            nameCell.style.textDecoration = 'underline';
          }
        `);
        
        // Add mouseout event to restore normal text decoration
        row.setAttribute('onmouseout', `
          // Find the name cell in this row
          if (this.cells[${finalNameColumnIndex}]) {
            const nameCell = this.cells[${finalNameColumnIndex}];
            // Restore original text decoration
            nameCell.style.textDecoration = nameCell.getAttribute('data-original-decoration') || 'none';
          }
        `);
      }
    }
    
    // Remove existing colgroup to allow auto-sizing
    let colgroup = table.querySelector('colgroup');
    if (colgroup) {
      colgroup.remove();
    }
    
    // Add CSS class to ensure the table doesn't expand beyond necessary size
    table.classList.add('table-responsive-sm');

    return tempDiv.innerHTML;
  }
}

// Initialize tooltips after table is created
export async function initializeTooltips() {
  // Make sure definitions are loaded before initializing tooltips
  if (!definitionsData) {
    try {
      await loadDefinitions();
    } catch (error) {
      console.error('Failed to load definitions for tooltips:', error);
    }
  }

  // Initialize Bootstrap tooltips
  if (typeof $ !== 'undefined') {
    console.log('Initializing tooltips');
    
    $('[data-toggle="tooltip"]').each(function() {
      const headerText = $(this).attr('data-original-text');
      if (!headerText) {
        console.warn('Missing data-original-text on tooltip element:', this);
        return;
      }
      
      const tooltipContent = getTooltipContent(headerText);
      if (tooltipContent) {
        $(this).attr('title', tooltipContent);
        console.log('Added tooltip for:', headerText);
      } else {
        console.warn('No definition found for:', headerText);
      }
    });
    
    // Force destroy any existing tooltips before reinitializing
    $('[data-toggle="tooltip"]').tooltip('dispose');
    
    // Initialize with options
    $('[data-toggle="tooltip"]').tooltip({
      html: true,
      container: 'body',
      trigger: 'hover',
      delay: {show: 200, hide: 100},
      placement: 'top'
    });
    
    console.log('Tooltips initialization complete');
  } else {
    console.error('jQuery not available for tooltips initialization');
  }
}

export function adjustColumnWidths(table) {
  if (!table) return;
  
  // Remove existing colgroup to allow auto-sizing
  let colgroup = table.querySelector('colgroup');
  if (colgroup) {
    colgroup.remove();
  }
  
  // Add CSS class to ensure the table doesn't expand beyond necessary size
  table.classList.add('table-responsive-sm');
}
