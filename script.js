// Replace with your Worker URL
const workerUrl = 'https://condor-results-worker.davis-chappins.workers.dev/';

// Function to fetch the list of keys from the KV store.
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

// Render the file list as clickable links.
async function renderFileList() {
  const fileListElement = document.getElementById('file-list');
  const listData = await fetchFileList();
  if (listData && listData.keys) {
    listData.keys.forEach(item => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = '#';
      link.textContent = item.name;
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        const fileUrl = workerUrl + '?file=' + encodeURIComponent(item.name);
        const lowerName = item.name.toLowerCase();
        
        if (lowerName.endsWith('.html')) {
          // Open HTML files in a new tab
          window.open(fileUrl, '_blank');
        } else if (lowerName.endsWith('.csv') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.zip')) {
          // For CSV, XLSX, or ZIP files, fetch as a blob and trigger a download.
          try {
            const fileResponse = await fetch(fileUrl);
            if (fileResponse.ok) {
              const blob = await fileResponse.blob();
              const downloadUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = downloadUrl;
              a.download = item.name;
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
          // For other file types, display the file content below the list.
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
      fileListElement.appendChild(li);
    });
  } else {
    fileListElement.innerHTML = '<li>No files found.</li>';
  }
}

renderFileList();
