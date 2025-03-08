// script.js
import { styleTable, adjustColumnWidths } from './table.js';

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

// Group files into custom categories with new names.
function groupFiles(fileNames) {
  const groups = {
    "Summary": [],
    "Thermal & Glide Performance": [],
    "Simplified Summaries": [],
    "Download IGCs": [],
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
      groups["Summary"].push(fileName);
      grouped = true;
    } else if (lowerName.endsWith('.html')) {
      if (lowerName.includes('summaryclimb_interactive') || lowerName.includes('groundspeed_vs_percent_time_spent')) {
        groups["Thermal & Glide Performance"].push(fileName);
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
    "Summary",
    "Thermal & Glide Performance",
    "Simplified Summaries",
    "Download IGCs",
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
        // fileUrl is only used for non-html downloads
        const fileUrl = workerUrl + '?file=' + encodeURIComponent(fullPath);
        const lowerName = fileName.toLowerCase();
  
        if (groupName === "Summary") {
          // For Summary, create a link that goes to the summary view.
          const fileNameWithoutExt = fileName.replace(/\.xlsx$/i, '');
          const summaryLink = document.createElement('a');
          const newUrl = (currentPath ? currentPath + '/' : '') + fileNameWithoutExt;
          summaryLink.href = '/' + newUrl;
          summaryLink.textContent = fileNameWithoutExt;
          li.appendChild(summaryLink);
  
        } else if (groupName === "Simplified Summaries") {
          // For Simplified Summaries, remove the .csv extension and link to a dedicated view.
          const fileNameWithoutExt = fileName.replace(/\.csv$/i, '');
          const summaryLink = document.createElement('a');
          const newUrl = (currentPath ? currentPath + '/' : '') + fileNameWithoutExt;
          summaryLink.href = '/' + newUrl;
          summaryLink.textContent = fileNameWithoutExt;
          li.appendChild(summaryLink);
  
        } else if (groupName === "Condor Club") {
          if (lowerName.endsWith('.txt')) {
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
            // Derive the corresponding text file name from the image file name.
            const textFileName = fileName.split('_task_image')[0] + '.txt';
            const textFilePath = currentPath ? `${currentPath}/${textFileName}` : textFileName;
            const textFileUrl = workerUrl + '?file=' + encodeURIComponent(textFilePath);
            
            const img = document.createElement('img');
            img.src = fileUrl; // show the image itself
            img.alt = fileName;
            img.style.cursor = 'pointer';
            img.addEventListener('click', async (e) => {
              e.preventDefault();
              try {
                const response = await fetch(textFileUrl);
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
            li.appendChild(img);
          }
        } else if (groupName === "Images") {
          const img = document.createElement('img');
          img.src = fileUrl;
          img.alt = fileName;
          li.appendChild(img);
        } else {
          // Default link for other groups.
          const link = document.createElement('a');
          link.href = '#';
          // For Thermal & Glide Performance, remove .html from link text.
          if (groupName === "Thermal & Glide Performance") {
            link.textContent = fileName.replace(/\.html$/i, '');
          } else {
            link.textContent = fileName;
          }
          link.addEventListener('click', async (e) => {
            e.preventDefault();
            if (lowerName.endsWith('.html')) {
              // Open locally with consistent URL structure.
              window.location.href = '/' + fullPath;
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
  // Prevent error if subtree is null (i.e. current path points to a file)
  if (!subtree) {
    fileListElement.innerHTML = '<li>This is a file view.</li>';
    return;
  }
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
            // Open locally with consistent URL structure.
            window.location.href = '/' + fullPath;
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

// New function: Render summary view for xlsx files.
async function renderSummaryView() {
  let currentPath = window.location.pathname;
  if (currentPath.startsWith('/')) {
    currentPath = currentPath.substring(1);
  }
  const pathParts = currentPath.split('/');
  const lastPart = pathParts[pathParts.length - 1];
  if (lastPart && !lastPart.includes('.') && lastPart.endsWith('_summary')) {
    const fileName = lastPart + '.xlsx';
    const parentPath = pathParts.slice(0, -1).join('/');
    const fileUrl = workerUrl + '?file=' + encodeURIComponent(parentPath ? parentPath + '/' + fileName : fileName);
    renderNavigation(pathParts);
    const container = document.getElementById('file-content');
    container.innerHTML = '';
    const downloadLink = document.createElement('a');
    downloadLink.href = "#";
    downloadLink.textContent = "Download " + fileName;
    downloadLink.style.marginRight = "10px";
    downloadLink.addEventListener('click', async function(e) {
      e.preventDefault();
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
    });
    container.appendChild(downloadLink);
    const tableContainer = document.createElement('div');
    // Add margin for summary view (e.g., 20px gap)
    tableContainer.style.marginTop = "150px";
    container.appendChild(tableContainer);
    try {
      const response = await fetch(fileUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        let htmlString = XLSX.utils.sheet_to_html(worksheet);
        htmlString = styleTable(htmlString);
        tableContainer.innerHTML = htmlString;
        setTimeout(() => {
          const table = tableContainer.querySelector('table');
          if (table) {
            adjustColumnWidths(table);
          }
        }, 0);
      } else {
        tableContainer.innerHTML = 'Error loading file: ' + response.status;
      }
    } catch (err) {
      tableContainer.innerHTML = 'Fetch error: ' + err;
    }
  }
}

// New function: Render simplified summary view for CSV files.
async function renderSimplifiedSummaryView() {
  let currentPath = window.location.pathname;
  if (currentPath.startsWith('/')) {
    currentPath = currentPath.substring(1);
  }
  const pathParts = currentPath.split('/');
  const lastPart = pathParts[pathParts.length - 1];
  console.log("renderSimplifiedSummaryView invoked, lastPart:", lastPart);
  if (lastPart && !lastPart.includes('.') && lastPart.includes('_slim_summary')) {
    const fileName = lastPart + '.csv';
    const parentPath = pathParts.slice(0, -1).join('/');
    const fileUrl = workerUrl + '?file=' + encodeURIComponent(parentPath ? parentPath + '/' + fileName : fileName);
    renderNavigation(pathParts);
    const container = document.getElementById('file-content');
    container.innerHTML = '';
    const downloadLink = document.createElement('a');
    downloadLink.href = "#";
    downloadLink.textContent = "Download " + fileName;
    downloadLink.style.marginRight = "10px";
    downloadLink.addEventListener('click', async function(e) {
      e.preventDefault();
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
    });
    container.appendChild(downloadLink);
    const tableContainer = document.createElement('div');
    // Add a smaller margin for slim summary view (e.g., 10px gap)
    tableContainer.style.marginTop = "50px";
    container.appendChild(tableContainer);
    try {
      const response = await fetch(fileUrl);
      if (response.ok) {
        const csvText = await response.text();
        const workbook = XLSX.read(csvText, { type: 'string' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        let htmlString = XLSX.utils.sheet_to_html(worksheet);
        htmlString = styleTable(htmlString);
        tableContainer.innerHTML = htmlString;
        setTimeout(() => {
          const table = tableContainer.querySelector('table');
          if (table) {
            adjustColumnWidths(table);
          }
        }, 0);
      } else {
        tableContainer.innerHTML = 'Error loading file: ' + response.status;
      }
    } catch (err) {
      tableContainer.innerHTML = 'Fetch error: ' + err;
    }
  } else {
    console.log("Not recognized as simplified summary view:", lastPart);
  }
}


// New function: Render HTML file content inside the layout (preserving header and nav).
async function renderHtmlFileContent(fullPath) {
  // fullPath is like "US_Soaring/US_Soaring_Q1_2025_(Jan_Feb_Mar)/Competition_day_19/Competition_day_19_groundspeed_vs_percent_time_spent.html"
  const pathParts = fullPath.split('/');
  // Do not modify the last segment; use the original pathParts for navigation.
  renderNavigation(pathParts);
  
  // Load the HTML file into the file-content container via an iframe.
  const container = document.getElementById('file-content');
  container.innerHTML = '';
  const fileUrl = workerUrl + '?file=' + encodeURIComponent(fullPath);
  const iframe = document.createElement('iframe');
  iframe.src = fileUrl;
  iframe.style.width = "100%";
  iframe.style.height = "95vh"; // adjust as needed
  iframe.style.border = "none";
  iframe.style.display = "block";
  iframe.style.margin = "0";
  container.appendChild(iframe);
}

// Existing function for non-HTML file view.
async function renderFileContent(fullPath) {
  document.body.innerHTML = '';
  const fileUrl = workerUrl + '?file=' + encodeURIComponent(fullPath);
  const iframe = document.createElement('iframe');
  iframe.src = fileUrl;
  iframe.style.width = "100%";
  iframe.style.height = "100vh";
  document.body.appendChild(iframe);
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

document.addEventListener('DOMContentLoaded', async function() {
  let currentPath = window.location.pathname;
  if (currentPath.startsWith('/')) {
    currentPath = currentPath.substring(1);
  }
  const pathParts = currentPath.split('/');
  const lastPart = pathParts[pathParts.length - 1];
  if (lastPart && lastPart.includes('.')) {
    if (lastPart.toLowerCase().endsWith('.html')) {
      await renderHtmlFileContent(currentPath);
    } else {
      await renderFileContent(currentPath);
    }
  } else {
    if (lastPart.includes('_slim_summary')) {
      await renderSimplifiedSummaryView();
    } else if (lastPart.endsWith('_summary')) {
      await renderSummaryView();
    } else {
      await renderFileTree();
    }
  }
});
