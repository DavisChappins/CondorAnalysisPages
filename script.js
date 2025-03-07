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

// Render a group of files under a heading.
function renderGroupedFiles(fileNames, currentPath) {
  const groups = groupFiles(fileNames);
  const container = document.createElement('div');
  
  // Define the desired order of groups.
  const groupOrder = [
    "Summary xlsx",
    "Thermal & Glide html",
    "Download IGCs",
    "Simplified Summaries",
    "Condor Club",
    "Images",
    "Other"
  ];
  
  groupOrder.forEach(groupName => {
    if (groups[groupName] && groups[groupName].length > 0) {
      const heading = document.createElement('h3');
      heading.textContent = groupName;
      container.appendChild(heading);
  
      const ul = document.createElement('ul');
      
      groups[groupName].forEach(fileName => {
        const li = document.createElement('li');
        const fullPath = currentPath ? `${currentPath}/${fileName}` : fileName;
        const fileUrl = workerUrl + '?file=' + encodeURIComponent(fullPath);
        const lowerName = fileName.toLowerCase();
  
        // Special handling for "Summary xlsx"
        if (groupName === "Summary xlsx") {
          // Create a container for both the download link and collapsible preview.
          const fileContainer = document.createElement('div');
  
          // Create a download link.
          const downloadLink = document.createElement('a');
          downloadLink.href = fileUrl;
          downloadLink.download = fileName;
          downloadLink.textContent = "Download " + fileName;
          downloadLink.style.marginRight = "10px";
          fileContainer.appendChild(downloadLink);
  
          // Create a collapsible container using <details>.
          const details = document.createElement('details');
          // Create a summary element to label the collapsible section.
          const summaryEl = document.createElement('summary');
          summaryEl.textContent = "Show Table Preview";
          details.appendChild(summaryEl);
  
          // Create a container where the parsed table will be inserted.
          const tableContainer = document.createElement('div');
          details.appendChild(tableContainer);
  
          // Only fetch and parse when the details are opened.
          details.addEventListener('toggle', async function() {
            if (details.open && !details.dataset.loaded) {
              try {
                const response = await fetch(fileUrl);
                if (response.ok) {
                  // Get the file as an ArrayBuffer.
                  const arrayBuffer = await response.arrayBuffer();
                  // Read the XLSX file.
                  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                  // Get the first sheet (or specify a sheet name if needed).
                  const firstSheetName = workbook.SheetNames[0];
                  const worksheet = workbook.Sheets[firstSheetName];
                  // Convert the worksheet to HTML.
                  let htmlString = XLSX.utils.sheet_to_html(worksheet);
                  // Use a temporary container to adjust the generated HTML.
                  const tempDiv = document.createElement('div');
                  tempDiv.innerHTML = htmlString;
                  // Find the table and add Bootstrap classes for a modern look.
                  const table = tempDiv.querySelector('table');
                  if (table) {
                    table.classList.add('table', 'table-striped', 'table-hover');
                  }
                  // Insert the updated HTML into our container.
                  tableContainer.innerHTML = tempDiv.innerHTML;
                  // Mark as loaded so that we don't re-fetch on subsequent toggles.
                  details.dataset.loaded = "true";
                } else {
                  tableContainer.innerHTML = 'Error loading file: ' + response.status;
                }
              } catch (err) {
                tableContainer.innerHTML = 'Fetch error: ' + err;
              }
            }
          });
  
          fileContainer.appendChild(details);
          li.appendChild(fileContainer);
  
        } else if (groupName === "Condor Club") {
          // Existing handling for "Condor Club"
          if (lowerName.endsWith('.txt')) {
            // Render TXT file as a link labeled "Race Results" that opens in a new window.
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = "Race Results";
            link.addEventListener('click', async (e) => {
              e.preventDefault();
              try {
                const response = await fetch(fileUrl);
                if (response.ok) {
                  const resultUrl = await response.text();
                  window.open(resultUrl, '_blank');
                } else {
                  console.error('Error fetching text file:', response.status);
                }
              } catch (err) {
                console.error('Fetch error:', err);
              }
            });
            li.appendChild(link);
            li.appendChild(document.createElement('br'));
          } else if (lowerName.endsWith('_task_image.jpg')) {
            const img = document.createElement('img');
            img.src = fileUrl;
            img.alt = fileName;
            li.appendChild(img);
          }
        } else if (groupName === "Images") {
          const img = document.createElement('img');
          img.src = fileUrl;
          img.alt = fileName;
          li.appendChild(img);
        } else {
          // Render default clickable link for other groups.
          const link = document.createElement('a');
          link.href = '#';
          link.textContent = fileName;
          link.addEventListener('click', async (e) => {
            e.preventDefault();
            if (lowerName.endsWith('.html')) {
              window.open(fileUrl, '_blank');
            } else if (lowerName.endsWith('.csv') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.zip')) {
              try {
                const fileResponse = await fetch(fileUrl);
                if (fileResponse.ok) {
                  const blob = await fileResponse.blob();
                  const downloadUrl = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = downloadUrl;
                  a.download = fileName;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(downloadUrl);
                } else {
                  console.error('Error downloading file:', fileResponse.status);
                }
              } catch (err) {
                console.error('Fetch error:', err);
              }
            } else {
              try {
                const fileResponse = await fetch(fileUrl);
                if (fileResponse.ok) {
                  const content = await fileResponse.text();
                  document.getElementById('file-content').innerText = content;
                } else {
                  document.getElementById('file-content').innerText = 'Error loading file.';
                }
              } catch (err) {
                console.error('Fetch error:', err);
              }
            }
          });
          li.appendChild(link);
        }
  
        ul.appendChild(li);
      });
      container.appendChild(ul);
    }
  });
  return container;
}

// Render the current folder's contents.
function renderTreeView(subtree, currentPath) {
  const fileListElement = document.getElementById('file-list');
  fileListElement.innerHTML = '';
  const keys = Object.keys(subtree);
  const onlyFiles = keys.every(key => subtree[key] === null);

  if (onlyFiles) {
    const groupedContainer = renderGroupedFiles(keys, currentPath);
    fileListElement.appendChild(groupedContainer);
  } else {
    Object.keys(subtree).forEach(key => {
      const li = document.createElement('li');
      const fullPath = currentPath ? `${currentPath}/${key}` : key;
      if (subtree[key] === null) {
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = key;
        link.addEventListener('click', async (e) => {
          e.preventDefault();
          const fileUrl = workerUrl + '?file=' + encodeURIComponent(fullPath);
          const lowerName = key.toLowerCase();
          if (lowerName.endsWith('.html')) {
            window.open(fileUrl, '_blank');
          } else if (lowerName.endsWith('.csv') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.zip')) {
            try {
              const fileResponse = await fetch(fileUrl);
              if (fileResponse.ok) {
                const blob = await fileResponse.blob();
                const downloadUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = key;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(downloadUrl);
              } else {
                console.error('Error downloading file:', fileResponse.status);
              }
            } catch (err) {
              console.error('Fetch error:', err);
            }
          } else {
            try {
              const fileResponse = await fetch(fileUrl);
              if (fileResponse.ok) {
                const content = await fileResponse.text();
                document.getElementById('file-content').innerText = content;
              } else {
                document.getElementById('file-content').innerText = 'Error loading file.';
              }
            } catch (err) {
              console.error('Fetch error:', err);
            }
          }
        });
        li.appendChild(link);
      } else {
        const link = document.createElement('a');
        link.href = '/' + fullPath;
        link.textContent = key;
        li.appendChild(link);
      }
      fileListElement.appendChild(li);
    });
  }
}

// Render breadcrumb navigation.
function renderNavigation(currentPathParts) {
  const nav = document.getElementById('navigation');
  nav.innerHTML = '';
  const homeLink = document.createElement('a');
  homeLink.href = '/';
  homeLink.textContent = 'Home';
  nav.appendChild(homeLink);
  let pathSoFar = '';
  currentPathParts.forEach((part, index) => {
    nav.appendChild(document.createTextNode(' / '));
    pathSoFar += (index === 0 ? part : '/' + part);
    const link = document.createElement('a');
    link.href = '/' + pathSoFar;
    link.textContent = part;
    nav.appendChild(link);
  });
}

// Main function: fetch keys, build tree, and render view based on URL.
async function renderFileTree() {
  const listData = await fetchFileList();
  if (listData && listData.keys) {
    const tree = buildFileTree(listData.keys);
    console.log('Full Tree:', tree);
    let currentPath = window.location.pathname;
    if (currentPath.startsWith('/')) {
      currentPath = currentPath.substring(1);
    }
    const currentPathParts = currentPath ? currentPath.split('/') : [];
    console.log('Current Path Parts:', currentPathParts);
    renderNavigation(currentPathParts);
    const subtree = getSubtree(tree, currentPathParts);
    console.log('Subtree for current path:', subtree);
    renderTreeView(subtree, currentPath);
  } else {
    document.getElementById('file-list').innerHTML = '<li>No files found.</li>';
  }
}

document.addEventListener('DOMContentLoaded', renderFileTree);
