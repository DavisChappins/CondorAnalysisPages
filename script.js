// Replace with your Worker URL
const workerUrl = 'https://condor-results-worker.davis-chappins.workers.dev/';

// Fetch the list of keys from KV
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

// Build a nested tree structure from the flat keys
function buildFileTree(keys) {
  const tree = {};
  keys.forEach(item => {
    // Split the key on "/" to get folders and file name
    const parts = item.name.split('/');
    let current = tree;
    parts.forEach((part, index) => {
      // If we're at the last part, it's a file; otherwise, it's a folder
      if (index === parts.length - 1) {
        current[part] = null;  // Mark as file (could also store additional info here)
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

// Render the tree as nested lists
function renderTree(tree, container, prefix = '') {
  Object.keys(tree).forEach(key => {
    const fullPath = prefix ? `${prefix}/${key}` : key;
    const li = document.createElement('li');

    if (tree[key] === null) {
      // This is a file; create a clickable link.
      const link = document.createElement('a');
      link.href = '#';
      link.textContent = key;
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        const lowerName = key.toLowerCase();
        const fileUrl = workerUrl + '?file=' + encodeURIComponent(fullPath);

        if (lowerName.endsWith('.html')) {
          // Open HTML files in a new tab/window.
          window.open(fileUrl, '_blank');
        } else if (lowerName.endsWith('.csv') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.zip')) {
          // For downloads, fetch as blob and trigger download.
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
          // For other file types, display content below the list.
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
      // This is a folder; display as a folder header and render its contents.
      const span = document.createElement('span');
      span.textContent = key;
      li.appendChild(span);
      
      const ul = document.createElement('ul');
      renderTree(tree[key], ul, fullPath);
      li.appendChild(ul);
    }
    container.appendChild(li);
  });
}

// Fetch, build the tree, and render it
async function renderFileTree() {
  const fileListElement = document.getElementById('file-list');
  const listData = await fetchFileList();
  if (listData && listData.keys) {
    const tree = buildFileTree(listData.keys);
    renderTree(tree, fileListElement);
  } else {
    fileListElement.innerHTML = '<li>No files found.</li>';
  }
}

renderFileTree();
