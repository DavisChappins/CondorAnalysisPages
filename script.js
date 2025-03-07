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
    const parts = item.name.split('/'); // split on "/"
    let current = tree;
    parts.forEach((part, index) => {
      // If last part, mark as file; otherwise, create or use an existing folder object.
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

// Given a tree and an array of folder names, get the subtree at that path.
function getSubtree(tree, pathParts) {
  let subtree = tree;
  for (let part of pathParts) {
    if (subtree[part] !== undefined) {
      subtree = subtree[part];
    } else {
      subtree = {};
      break;
    }
  }
  return subtree;
}

// Render breadcrumb navigation based on the current path.
function renderNavigation(currentPathParts) {
  const nav = document.getElementById('navigation');
  nav.innerHTML = '';

  // Create a "Home" link.
  const homeLink = document.createElement('a');
  homeLink.href = '/';
  homeLink.textContent = 'Home';
  nav.appendChild(homeLink);

  // For each part in the current path, create a link.
  let pathSoFar = '';
  currentPathParts.forEach((part, index) => {
    nav.appendChild(document.createTextNode(' / '));
    pathSoFar += (index === 0 ? part : '/' + part);
    const link = document.createElement('a');
    // Navigating to a folder means updating the URL.
    link.href = '/' + pathSoFar;
    link.textContent = part;
    nav.appendChild(link);
  });
}

// Render the current folder's items.
function renderTreeView(subtree, currentPath) {
  const fileListElement = document.getElementById('file-list');
  fileListElement.innerHTML = '';

  // Iterate over the keys in the current subtree.
  Object.keys(subtree).forEach(key => {
    const li = document.createElement('li');

    // Build the full key/path from the current folder.
    const fullPath = currentPath ? currentPath + '/' + key : key;

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
          // Open HTML files in a new tab.
          window.open(fileUrl, '_blank');
        } else if (lowerName.endsWith('.csv') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.zip')) {
          // For these file types, download as a blob.
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
          // For other file types, display content below.
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
      // This is a folder: create a link that navigates into the folder.
      const link = document.createElement('a');
      // Set the href to the new folder path.
      link.href = (currentPath ? '/' + currentPath + '/' : '/') + key;
      link.textContent = key;
      li.appendChild(link);
    }
    fileListElement.appendChild(li);
  });
}

// Main function to fetch keys, build the tree, and render based on URL.
async function renderFileTree() {
  const listData = await fetchFileList();
  if (listData && listData.keys) {
    const tree = buildFileTree(listData.keys);
    
    // Get the current folder from the URL's pathname.
    let currentPath = window.location.pathname;
    if (currentPath.startsWith('/')) {
      currentPath = currentPath.substring(1); // remove leading slash
    }
    // Split into parts; if empty, we are at the root.
    const currentPathParts = currentPath ? currentPath.split('/') : [];
    
    // Render navigation breadcrumbs.
    renderNavigation(currentPathParts);
    
    // Get the subtree for the current folder.
    const subtree = getSubtree(tree, currentPathParts);
    
    // Render the file/folder list for the current folder.
    renderTreeView(subtree, currentPath);
  } else {
    document.getElementById('file-list').innerHTML = '<li>No files found.</li>';
  }
}

// Run our main function once the page is loaded.
document.addEventListener('DOMContentLoaded', renderFileTree);
