// Replace with your Worker URL
const workerUrl = 'https://condor-results-worker.davis-chappins.workers.dev/';

// Fetch the list of keys from the KV store.
async function fetchFileList() {
  try {
    const response = await fetch(workerUrl + '?list=1');
    if (response.ok) {
      return await response.json();
    } else {
      console.error('Error fetching file list:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
}

// Build a nested tree structure from the flat list of keys.
function buildFileTree(keys) {
  const tree = {};
  keys.forEach(item => {
    const parts = item.name.split('/'); // split on '/'
    let current = tree;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        current[part] = null;
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    });
  });
  return tree;
}

// Get the subtree based on the path parts.
function getSubtree(tree, pathParts) {
  let subtree = tree;
  for (let part of pathParts) {
    if (subtree[part] !== undefined) {
      subtree = subtree[part];
    } else {
      return {};
    }
  }
  return subtree;
}

// Group files into custom categories, adding a new "Condor Club" group.
function groupFiles(fileNames) {
  const groups = {
    "Summary xlsx": [],
    "Thermal & Glide html": [],
    "Download IGCs": [],
    "Simplified Summaries": [],
    "Condor Club": [],
    "Images": [],
    "Other": []
  };

  fileNames.forEach(fileName => {
    if (typeof fileName !== 'string' || fileName.trim() === '') {
      console.error('Invalid file name:', fileName);
      return;
    }

    const lowerName = fileName.toLowerCase();
    let grouped = false;

    // New rule for "Condor Club"
    if ((lowerName.endsWith('.txt') && fileName.indexOf('Competition_day_') !== -1) ||
        (lowerName.endsWith('_task_image.jpg'))) {
      groups["Condor Club"].push(fileName);
      grouped = true;
    } else if (lowerName.endsWith('.xlsx')) {
      groups["Summary xlsx"].push(fileName);
      grouped = true;
    } else if (lowerName.endsWith('.html')) {
      if (lowerName.includes('summaryclimb_interactive') || lowerName.includes('groundspeed_vs_percent_time_spent')) {
        groups["Thermal & Glide html"].push(fileName);
        grouped = true;
      }
    } else if (lowerName.endsWith('.zip')) {
      groups["Download IGCs"].push(fileName);
      grouped = true;
    } else if (lowerName.endsWith('.csv')) {
      if (lowerName.includes('slim_summary')) {
        groups["Simplified Summaries"].push(fileName);
        grouped = true;
      }
    } else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png')) {
      groups["Images"].push(fileName);
      grouped = true;
    }

    if (!grouped) {
      groups["Other"].push(fileName);
    }
  });
  return groups;
}

// Your existing functions remain unchanged

// Load and render XLSX data into a DataTable
async function renderXlsxTable(fileUrl) {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error('Failed to fetch file');
    const data = await response.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

    if (jsonData.length === 0) throw new Error('Empty sheet');

    const headers = jsonData.shift();
    const columns = headers.map(header => ({ title: header }));

    if ($.fn.DataTable.isDataTable('#xlsx-table')) {
      $('#xlsx-table').DataTable().clear().destroy();
    }

    $('#xlsx-table').DataTable({
      data: jsonData,
      columns: columns
    });
  } catch (error) {
    console.error('Error parsing XLSX:', error);
    document.getElementById('xlsx-container').innerHTML = `<p>Error loading Excel file: ${error.message}</p>`;
  }
}

// Main function call remains unchanged
document.addEventListener('DOMContentLoaded', renderFileTree);
