// UI Elements
const selectInputBtn = document.getElementById('selectInputBtn');
const selectOutputBtn = document.getElementById('selectOutputBtn');
const selectFileBtn = document.getElementById('selectFileBtn');
const selectOutputFileBtn = document.getElementById('selectOutputFileBtn');
const inputFolderInput = document.getElementById('inputFolder');
const outputFolderInput = document.getElementById('outputFolder');
const inputFileInput = document.getElementById('inputFile');
const outputFileInput = document.getElementById('outputFile');
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');
const fadeInDurationInput = document.getElementById('fadeInDuration');
const fadeOutDurationInput = document.getElementById('fadeOutDuration');
const normalizeVolumeInput = document.getElementById('normalizeVolume');
const outputFormatInput = document.getElementById('outputFormat');
const audioBitrateInput = document.getElementById('audioBitrate');
const sampleRateInput = document.getElementById('sampleRate');
const filenamePrefixInput = document.getElementById('filenamePrefix');
const filenameSuffixInput = document.getElementById('filenameSuffix');
const qualitySettings = document.getElementById('qualitySettings');
const processBtn = document.getElementById('processBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const statusMessage = document.getElementById('statusMessage');
const inputFilePreview = document.getElementById('inputFilePreview');
const fileList = document.getElementById('fileList');
const fileCount = document.getElementById('fileCount');
const modeSingle = document.getElementById('modeSingle');
const modeFolder = document.getElementById('modeFolder');
const singleFileSection = document.getElementById('singleFileSection');
const folderSection = document.getElementById('folderSection');
const singleFileOutputSection = document.getElementById('singleFileOutputSection');
const folderOutputSection = document.getElementById('folderOutputSection');
const singleFileMode = document.getElementById('singleFileMode');
const folderMode = document.getElementById('folderMode');

// State
let isProcessing = false;
let currentMode = 'folder'; // 'single' or 'folder'

// Mode switching
modeSingle.addEventListener('change', () => {
  if (modeSingle.checked) {
    currentMode = 'single';
    switchToSingleFileMode();
  }
});

modeFolder.addEventListener('change', () => {
  if (modeFolder.checked) {
    currentMode = 'folder';
    switchToFolderMode();
  }
});

function switchToSingleFileMode() {
  singleFileSection.classList.remove('hidden');
  folderSection.classList.add('hidden');
  singleFileOutputSection.classList.remove('hidden');
  folderOutputSection.classList.add('hidden');
  singleFileMode.classList.add('active');
  folderMode.classList.remove('active');
  inputFilePreview.classList.remove('active');
  updateProcessButton();
}

function switchToFolderMode() {
  singleFileSection.classList.add('hidden');
  folderSection.classList.remove('hidden');
  singleFileOutputSection.classList.add('hidden');
  folderOutputSection.classList.remove('hidden');
  singleFileMode.classList.remove('active');
  folderMode.classList.add('active');
  updateProcessButton();
}

// Event Listeners
selectInputBtn.addEventListener('click', async () => {
  const folder = await window.electronAPI.selectFolder();
  if (folder) {
    inputFolderInput.value = folder;
    inputFolderInput.classList.add('has-value');
    updateProcessButton();
    await scanInputFolder(folder);
  }
});

selectOutputBtn.addEventListener('click', async () => {
  const folder = await window.electronAPI.selectFolder();
  if (folder) {
    outputFolderInput.value = folder;
    outputFolderInput.classList.add('has-value');
    updateProcessButton();
  }
});

selectFileBtn.addEventListener('click', async () => {
  const file = await window.electronAPI.selectFile();
  if (file) {
    inputFileInput.value = file;
    inputFileInput.classList.add('has-value');
    // Auto-suggest output file path
    const lastDot = file.lastIndexOf('.');
    const lastSlash = Math.max(file.lastIndexOf('\\'), file.lastIndexOf('/'));
    if (lastDot > lastSlash) {
      const ext = file.substring(lastDot);
      const name = file.substring(lastSlash + 1, lastDot);
      const dir = file.substring(0, lastSlash + 1);
      // Use current suffix setting (empty string if not set, no default)
      const suffix = filenameSuffixInput ? filenameSuffixInput.value.trim() : '';
      const prefix = filenamePrefixInput ? filenamePrefixInput.value.trim() : '';
      const suggestedPath = dir + prefix + name + suffix + ext;
      outputFileInput.value = suggestedPath;
      outputFileInput.classList.add('has-value');
    }
    updateProcessButton();
  }
});

// Update output file path when prefix/suffix changes (single file mode)
function updateSingleFileOutputPath() {
  if (currentMode === 'single' && inputFileInput && inputFileInput.value) {
    const file = inputFileInput.value;
    const lastDot = file.lastIndexOf('.');
    const lastSlash = Math.max(file.lastIndexOf('\\'), file.lastIndexOf('/'));
    if (lastDot > lastSlash) {
      const ext = file.substring(lastDot);
      const name = file.substring(lastSlash + 1, lastDot);
      const dir = file.substring(0, lastSlash + 1);
      const suffix = filenameSuffixInput ? filenameSuffixInput.value.trim() : '';
      const prefix = filenamePrefixInput ? filenamePrefixInput.value.trim() : '';
      const suggestedPath = dir + prefix + name + suffix + ext;
      outputFileInput.value = suggestedPath;
    }
  }
}

// Listen for changes to prefix/suffix fields
if (filenamePrefixInput) {
  filenamePrefixInput.addEventListener('input', updateSingleFileOutputPath);
  filenamePrefixInput.addEventListener('change', updateSingleFileOutputPath);
}
if (filenameSuffixInput) {
  filenameSuffixInput.addEventListener('input', updateSingleFileOutputPath);
  filenameSuffixInput.addEventListener('change', updateSingleFileOutputPath);
}

selectOutputFileBtn.addEventListener('click', async () => {
  const defaultPath = outputFileInput.value || '';
  const file = await window.electronAPI.saveFile(defaultPath);
  if (file) {
    outputFileInput.value = file;
    outputFileInput.classList.add('has-value');
    updateProcessButton();
  }
});

processBtn.addEventListener('click', async () => {
  if (isProcessing) return;
  
  const startTime = startTimeInput.value ? parseFloat(startTimeInput.value) : null;
  const endTime = endTimeInput.value ? parseFloat(endTimeInput.value) : null;
  const fadeInDuration = parseFloat(fadeInDurationInput.value) || 0;
  const fadeOutDuration = parseFloat(fadeOutDurationInput.value) || 0;
  const normalizeVolume = normalizeVolumeInput.checked;
  const outputFormat = outputFormatInput.value;
  const audioBitrate = audioBitrateInput ? audioBitrateInput.value : 'auto';
  const sampleRate = sampleRateInput ? sampleRateInput.value : 'auto';
  // Get prefix and suffix values - use empty string if field exists but is empty
  const filenamePrefix = filenamePrefixInput ? filenamePrefixInput.value.trim() : '';
  const filenameSuffix = filenameSuffixInput ? filenameSuffixInput.value.trim() : '';

  if (fadeInDuration < 0 || fadeOutDuration < 0) {
    showStatus('Fade durations must be positive', 'error');
    return;
  }

  isProcessing = true;
  processBtn.disabled = true;
  progressContainer.classList.add('active');
  statusMessage.classList.remove('success', 'error');
  statusMessage.style.display = 'none';

  try {
    if (currentMode === 'single') {
      // Single file processing
      const inputFile = inputFileInput.value;
      const outputFile = outputFileInput.value;

      if (!inputFile || !outputFile) {
        showStatus('Please select both input and output files', 'error');
        return;
      }

      progressText.textContent = 'Processing file...';
      progressFill.style.width = '50%';
      progressFill.textContent = '50%';

      // Check if output would overwrite input
      if (inputFile === outputFile) {
        showStatus('Error: Output file would overwrite input file. Please choose a different output location.', 'error');
        isProcessing = false;
        processBtn.disabled = false;
        progressContainer.classList.remove('active');
        return;
      }

      const result = await window.electronAPI.processAudio({
        inputPath: inputFile,
        outputPath: outputFile,
        startTime,
        endTime,
        fadeInDuration,
        fadeOutDuration,
        normalizeVolume,
        outputFormat,
        audioBitrate,
        sampleRate
      });

      if (result.success) {
        progressFill.style.width = '100%';
        progressFill.textContent = '100%';
        progressText.textContent = 'Complete!';
        // Get output folder path (parent directory of output file)
        const outputFolder = outputFile.substring(0, Math.max(outputFile.lastIndexOf('\\'), outputFile.lastIndexOf('/')));
        showStatus('File processed successfully!', 'success', outputFolder);
      } else {
        showStatus(`Error: ${result.error}`, 'error');
      }
    } else {
      // Batch folder processing
      const inputDir = inputFolderInput.value;
      const outputDir = outputFolderInput.value;

      if (!inputDir || !outputDir) {
        showStatus('Please select both input and output folders', 'error');
        return;
      }

      // Set up progress listener
      window.electronAPI.onBatchProgress((progress) => {
        updateProgress(progress);
      });

      // Start batch processing
      const result = await window.electronAPI.batchProcess({
        inputDir,
        outputDir,
        startTime,
        endTime,
        fadeInDuration,
        fadeOutDuration,
        normalizeVolume,
        outputFormat,
        audioBitrate,
        sampleRate,
        filenamePrefix,
        filenameSuffix
      });

      if (result.success) {
        const successCount = result.results.filter(r => r.success).length;
        const totalCount = result.results.length;
        const failedCount = totalCount - successCount;
        
        let message = `Successfully processed ${successCount} of ${totalCount} files!`;
        if (failedCount > 0) {
          const failedFiles = result.results
            .filter(r => !r.success)
            .slice(0, 5)
            .map(r => {
              const fileName = r.inputPath.split(/[\\/]/).pop();
              return `${fileName}: ${r.error || 'Unknown error'}`;
            })
            .join('\n');
          message += `\n\n${failedCount} file(s) failed. First errors:\n${failedFiles}`;
          if (failedCount > 5) {
            message += `\n... and ${failedCount - 5} more`;
          }
        }
        
        const statusType = failedCount > 0 ? 'error' : 'success';
        const outputPath = statusType === 'success' ? outputDir : null;
        showStatus(message, statusType, outputPath);
      } else {
        showStatus(`Error: ${result.error}`, 'error');
      }
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    isProcessing = false;
    processBtn.disabled = false;
    setTimeout(() => {
      progressContainer.classList.remove('active');
    }, 2000);
  }
});

// Helper Functions
function updateProcessButton() {
  const processInstruction = document.getElementById('processInstruction');
  
  if (currentMode === 'single') {
    const hasInput = inputFileInput.value.trim() !== '';
    const hasOutput = outputFileInput.value.trim() !== '';
    const isEnabled = hasInput && hasOutput && !isProcessing;
    processBtn.disabled = !isEnabled;
    
    // Show/hide instruction text
    if (processInstruction) {
      if (isEnabled) {
        processInstruction.classList.add('hidden');
      } else {
        processInstruction.classList.remove('hidden');
        processInstruction.textContent = 'Step 1: Browse for a file to begin.';
      }
    }
  } else {
    const hasInput = inputFolderInput.value.trim() !== '';
    const hasOutput = outputFolderInput.value.trim() !== '';
    const isEnabled = hasInput && hasOutput && !isProcessing;
    processBtn.disabled = !isEnabled;
    
    // Show/hide instruction text
    if (processInstruction) {
      if (isEnabled) {
        processInstruction.classList.add('hidden');
      } else {
        processInstruction.classList.remove('hidden');
        processInstruction.textContent = 'Step 1: Browse for a folder to begin.';
      }
    }
  }
}

function updateProgress(progress) {
  const percent = progress.percent || 0;
  progressFill.style.width = `${percent}%`;
  progressFill.textContent = `${percent}%`;
  progressText.textContent = `Processing: ${progress.file} (${progress.current} of ${progress.total})`;
}

function showStatus(message, type, outputPath = null) {
  // Preserve line breaks
  let htmlContent = message.replace(/\n/g, '<br>');
  
  // Add "Open Folder" button for success messages with output path
  if (type === 'success' && outputPath) {
    htmlContent += '<br><br>';
    htmlContent += '<button class="btn-open-folder" data-output-path="' + escapeHtml(outputPath) + '">';
    htmlContent += '<i data-feather="folder"></i> Open Output Folder';
    htmlContent += '</button>';
  }
  
  statusMessage.innerHTML = htmlContent;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = 'block';
  
  // Re-initialize Feather icons for the button
  if (typeof feather !== 'undefined') {
    feather.replace();
  }
  
  // Add click handler for the button
  if (type === 'success' && outputPath) {
    const openFolderBtn = statusMessage.querySelector('.btn-open-folder');
    if (openFolderBtn) {
      openFolderBtn.addEventListener('click', async () => {
        try {
          await window.electronAPI.openOutputFolder(outputPath);
        } catch (error) {
          console.error('Error opening folder:', error);
        }
      });
    }
  }
  
  // Scroll to bottom to see the message
  statusMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper Functions
async function scanInputFolder(folderPath) {
  try {
    const result = await window.electronAPI.scanFolder(folderPath);
    if (result.success && result.files.length > 0) {
      displayFileList(result.files);
    } else {
      hideFileList();
    }
  } catch (error) {
    console.error('Error scanning folder:', error);
    hideFileList();
  }
}

function displayFileList(files) {
  fileList.innerHTML = '';
  fileCount.textContent = `${files.length} file${files.length !== 1 ? 's' : ''}`;
  
  // Show first 10 files, then indicate if there are more
  const displayFiles = files.slice(0, 10);
  
  displayFiles.forEach(file => {
    const li = document.createElement('li');
    li.className = 'file-list-item';
    li.innerHTML = `
      <span class="file-format-badge">${file.ext}</span>
      <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name}</span>
    `;
    fileList.appendChild(li);
  });
  
  if (files.length > 10) {
    const li = document.createElement('li');
    li.className = 'file-list-item';
    li.style.fontStyle = 'italic';
    li.style.color = '#888';
    li.textContent = `... and ${files.length - 10} more files`;
    fileList.appendChild(li);
  }
  
  inputFilePreview.classList.add('active');
}

function hideFileList() {
  inputFilePreview.classList.remove('active');
  fileList.innerHTML = '';
  fileCount.textContent = '0 files';
}

// About modal
const headerAboutBtn = document.getElementById('headerAboutBtn');
const aboutModal = document.getElementById('aboutModal');
const closeAboutBtn = document.getElementById('closeAboutBtn');

function showAboutModal() {
  if (aboutModal) {
    aboutModal.classList.add('active');
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  }
}

if (headerAboutBtn) {
  headerAboutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showAboutModal();
  });
}

if (closeAboutBtn) {
  closeAboutBtn.addEventListener('click', () => {
    aboutModal.classList.remove('active');
  });
}

// Close modal when clicking outside
if (aboutModal) {
  aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) {
      aboutModal.classList.remove('active');
    }
  });
}

// Show/hide quality settings based on output format
outputFormatInput.addEventListener('change', () => {
  const format = outputFormatInput.value;
  if (format !== 'same') {
    qualitySettings.style.display = 'block';
  } else {
    qualitySettings.style.display = 'none';
  }
});

// Initialize
updateProcessButton();

// Re-initialize Feather icons after DOM updates
if (typeof feather !== 'undefined') {
    feather.replace();
}



