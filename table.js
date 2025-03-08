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
    
    // Set table to have a flexible layout that fits content
    table.style.tableLayout = 'auto'; 
    table.style.width = 'max-content';
    table.style.fontSize = '0.7rem';
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
    `;
    document.head.appendChild(style);
    
    // Global style for all table cells
    const allCells = table.querySelectorAll('td, th');
    allCells.forEach(cell => {
      cell.style.padding = '1px 2px'; // Add 1px vertical padding
      cell.style.verticalAlign = 'middle'; // Consistent vertical alignment
      cell.style.fontSize = '0.7rem';
      cell.style.lineHeight = '1'; // Reduce line height to minimize vertical space
    });
    
    // First, adjust the data cells to determine optimal column width
    const rows = table.querySelectorAll('tr');
    
    // Skip header row, style data rows first to establish column widths
    for (let r = 1; r < rows.length; r++) {
      const currentRow = rows[r];
      const firstCell = currentRow.cells[0];
      if (firstCell) {
        firstCell.style.whiteSpace = 'nowrap';
        firstCell.style.textAlign = 'left';
      }
      
      // Apply compact styling to all data cells
      for (let i = 1; i < currentRow.cells.length; i++) {
        const cell = currentRow.cells[i];
        if (cell) {
          cell.style.whiteSpace = 'nowrap';
          cell.style.width = 'fit-content';
          cell.style.minWidth = '36px';
          cell.style.maxWidth = '50px';
          
          // Adjust the content to remove extra space before small numbers
          const content = cell.textContent.trim();
          if (!isNaN(parseFloat(content)) && isFinite(content)) {
            // For numeric content, create a more compact display
            cell.innerHTML = '';
            const span = document.createElement('span');
            span.textContent = content;
            span.style.display = 'inline-block';
            
            // Always right-align all numbers for consistency
            cell.style.textAlign = 'right';
            
            // Adjust padding based on content length - only horizontal padding
            if (content.length >= 6) {
              // Larger numbers get a bit more padding
              cell.style.paddingRight = '3px';
            }
            
            cell.appendChild(span);
          }
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

    // Style headers after data cells so they don't dictate column width
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
      
      if (index === 0) {
        // Don't rotate first column header (Name)
        cell.style.whiteSpace = 'nowrap';
        return;
      }
      
      // Use absolute positioning for rotated text to avoid affecting column width
      const text = cell.textContent;
      cell.innerHTML = '';
      cell.style.position = 'relative';
      cell.style.height = '90px';
      cell.style.width = '36px';
      cell.style.maxWidth = '50px';
      cell.style.overflow = 'visible';
      
      const div = document.createElement('div');
      div.textContent = text;
      div.style.position = 'absolute';
      div.style.transformOrigin = 'left bottom';
      div.style.transform = 'rotate(-45deg)';
      div.style.whiteSpace = 'nowrap';
      div.style.fontSize = '0.7rem';
      div.style.bottom = '2px';
      div.style.left = '4px';
      div.style.width = 'auto';
      div.style.overflow = 'visible';
      
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
  }
  return tempDiv.innerHTML;
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
