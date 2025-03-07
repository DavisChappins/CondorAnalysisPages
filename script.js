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

// Render breadcrumb navigation.
function renderNavigation(currentPathParts) {
  const nav = document.getElementById('navigation');
  nav.innerHTML = '';

  // "Home" link (go to root)
  const homeLink = document.createElement('a');
  homeLink.href = '/';
  homeLink.textContent = 'Home';
  nav.appendChild(homeLink);

  // For each folder in the path, create a link.
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

// Render the current folder's contents (files and subfolders).
function renderTreeView(subtree, currentPath) {
  const fileListElement = document.getElementById('file-list');
  fileListElement.innerHTML = '';

  if (Object.keys(subtree).length === 0) {
    fileListElement.innerHTML = '<li>No items in this folder.</li>';
    return;
  }

  Object.keys(subtree).forEach(key => {
    const li = document.createElement('li');
    // Build the full path: if currentPath is empty, fullPath is key; otherwise join.
    const fullPath = currentPath ? `${currentPath}/${key}` : key;

    if (subtree[key] === null) {
      // This is a file.
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
      // This is a folder: make it a clickable link that navigates to that folder.
      const link = document.createElement('a');
      // Note: using relative link so that Cloudflare Pages handles navigation.
      link.href = '/' + fullPath;
      link.textContent = key;
      li.appendChild(link);
    }
    fileListElement.appendChild(li);
  });
}

// Main function: fetch keys, build tree, and render the view based on URL.
async function renderFileTree() {
  const listData = await fetchFileList();
  if (listData && listData.keys) {
    const tree = buildFileTree(listData.keys);
    console.log('Full Tree:', tree);

    // Get current path from URL (without query string)
    let currentPath = window.location.pathname;
    if (currentPath.startsWith('/')) {
      currentPath = currentPath.substring(1); // remove leading '/'
    }
    const currentPathParts = currentPath ? currentPath.split('/') : [];

    console.log('Current Path Parts:', currentPathParts);

    // Render breadcrumbs.
    renderNavigation(currentPathParts);

    // Get subtree for the current path.
    const subtree = getSubtree(tree, currentPathParts);
    console.log('Subtree for current path:', subtree);

    // Render the list of files/folders.
    renderTreeView(subtree, currentPath);
  } else {
    document.getElementById('file-list').innerHTML = '<li>No files found.</li>';
  }
}

document.addEventListener('DOMContentLoaded', renderFileTree);
