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
      // If this is the last part, it's a file.
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
      // If path doesn't exist, return an empty object.
      return {};
    }
  }
  return subtree;
}

// Group files into custom categories based on file name patterns.
function groupFiles(fileNames) {
  // Define your groups, including an "Other" group for files that don't match.
  const groups = {
    "Summary xlsx": [],
    "Thermal & Glide html": [],
    "Download IGCs": [],
    "Simplified Summaries": [],
    "Other": []
  };

  fileNames.forEach(fileName => {
    if (typeof fileName !== 'string' || fileName.trim() === '') {
      console.error('Invalid file name:', fileName);
      return;
    }
    
    const lowerName = fileName.toLowerCase();
    let grouped = false;

    if (lowerName.endsWith('.xlsx')) {
      groups["Summary xlsx"].push(fileName);
      grouped = true;
    } else if (lowerName.endsWith('.html')) {
      // Only group specific HTML files into "Thermal & Glide html"
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
    }
    
    // If the file didn't match any condition, put it into "Other"
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

  Object.keys(groups).forEach(groupName => {
    if (groups[groupName].length > 0) {
      // Heading for the group.
      const heading = document.createElement('h3');
      heading.textContent = groupName;
      container.appendChild(heading);

      const ul = document.createElement('ul');
      groups[groupName].forEach(fileName => {
        const li = document.createElement('li');
        const fullPath = currentPath ? `${currentPath}/${fileName}` : fileName;
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = fileName;
        link.addEventListener('click', async (e) => {
          e.preventDefault();
          const lowerName = fileName.toLowerCase();
          const fileUrl = workerUrl + '?file=' + encodeURIComponent(fullPath);

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

  // If subtree has only files (i.e. all keys have value null), group them.
  const keys = Object.keys(subtree);
  const onlyFiles = keys.every(key => subtree[key] === null);

  if (onlyFiles) {
    const groupedContainer = renderGroupedFiles(keys, currentPath);
    fileListElement.appendChild(groupedContainer);
  } else {
    // Otherwise, render folders and files in a simple list.
    Object.keys(subtree).forEach(key => {
      const li = document.createElement('li');
      const fullPath = currentPath ? `${currentPath}/${key}` : key;
      if (subtree[key] === null) {
        // File: create a clickable link.
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = key;
        link.addEventListener('click', async (e) => {
          e.preventDefault();
          const lowerName = key.toLowerCase();
          const fileUrl = workerUrl + '?file=' + encodeURIComponent(fullPath);
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
        // Folder: create a link that navigates to that folder.
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

  // "Home" link (go to root)
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

// Main function: fetch keys, build tree, and render the view based on URL.
async function renderFileTree() {
  const listData = await fetchFileList();
  if (listData && listData.keys) {
    const tree = buildFileTree(listData.keys);
    console.log('Full Tree:', tree);

    // Get current path from URL (remove leading slash)
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
