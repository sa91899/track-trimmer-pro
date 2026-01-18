const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
const path = require('path');
const fs = require('fs').promises;

// Get FFmpeg and FFprobe paths, handling both development and packaged environments
function getFFmpegPath() {
  let ffmpegPath = ffmpegStatic;
  
  // If path is inside app.asar, replace with app.asar.unpacked for packaged apps
  if (ffmpegPath && ffmpegPath.includes('app.asar')) {
    ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
  }
  
  // For packaged Mac apps, check if binary is in resources folder
  if (process.platform === 'darwin' && process.resourcesPath) {
    const resourcesPath = path.join(process.resourcesPath, 'ffmpeg');
    try {
      const fsSync = require('fs');
      if (fsSync.existsSync(resourcesPath)) {
        // Make sure it's executable
        fsSync.chmodSync(resourcesPath, '755');
        ffmpegPath = resourcesPath;
      }
    } catch (e) {
      // Fall back to default path from ffmpeg-static
      console.log('Could not use resources path, using default:', e.message);
    }
  }
  
  return ffmpegPath;
}

function getFFprobePath() {
  let ffprobePath = ffprobeStatic.path;
  
  // If path is inside app.asar, replace with app.asar.unpacked for packaged apps
  if (ffprobePath && ffprobePath.includes('app.asar')) {
    ffprobePath = ffprobePath.replace('app.asar', 'app.asar.unpacked');
  }
  
  // For packaged Mac apps, check if binary is in resources folder
  if (process.platform === 'darwin' && process.resourcesPath) {
    // Try architecture-specific binary first, then fall back to generic
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
    const resourcesPath = arch === 'arm64' 
      ? path.join(process.resourcesPath, 'ffprobe-arm64')
      : path.join(process.resourcesPath, 'ffprobe');
    
    try {
      const fsSync = require('fs');
      if (fsSync.existsSync(resourcesPath)) {
        // Make sure it's executable
        fsSync.chmodSync(resourcesPath, '755');
        ffprobePath = resourcesPath;
      } else {
        // Fall back to generic ffprobe
        const genericPath = path.join(process.resourcesPath, 'ffprobe');
        if (fsSync.existsSync(genericPath)) {
          fsSync.chmodSync(genericPath, '755');
          ffprobePath = genericPath;
        }
      }
    } catch (e) {
      // Fall back to default path from ffprobe-static
      console.log('Could not use resources path, using default:', e.message);
    }
  }
  
  return ffprobePath;
}

// Set ffmpeg and ffprobe paths
ffmpeg.setFfmpegPath(getFFmpegPath());
ffmpeg.setFfprobePath(getFFprobePath());

/**
 * Process a single audio file: trim and apply fade effects
 * @param {string} inputPath - Path to input audio file
 * @param {string} outputPath - Path to save processed file
 * @param {number} startTime - Start time in seconds (null = from beginning)
 * @param {number} endTime - End time in seconds (null = to end)
 * @param {number} fadeInDuration - Fade in duration in seconds (0 = no fade in)
 * @param {number} fadeOutDuration - Fade out duration in seconds (0 = no fade out)
 * @param {boolean} normalizeVolume - Whether to normalize volume
 * @param {string} outputFormat - Output format ('same', 'mp3', 'wav', 'flac', etc.)
 * @returns {Promise<Object>} Processing result
 */
/**
 * Validate that a file exists and is readable
 */
async function validateAudioFile(filePath) {
  try {
    const fsSync = require('fs');
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new Error('Path is not a file');
    }
    if (stats.size === 0) {
      throw new Error('File is empty');
    }
    // Check if file is readable
    fsSync.accessSync(filePath, fsSync.constants.R_OK);
    return true;
  } catch (error) {
    throw new Error(`File validation failed: ${error.message}`);
  }
}

function processAudioFile(inputPath, outputPath, startTime = null, endTime = null, fadeInDuration = 0, fadeOutDuration = 1.0, normalizeVolume = false, outputFormat = 'same', audioBitrate = 'auto', sampleRate = 'auto') {
  return new Promise(async (resolve, reject) => {
    try {
      // Validate input file first
      await validateAudioFile(inputPath);
    } catch (error) {
      reject(error);
      return;
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    
    // Get file extension to preserve format
    const inputExt = path.extname(inputPath).toLowerCase();
    const outputExt = path.extname(outputPath).toLowerCase();
    
    // Verify FFmpeg path (use the getter function to ensure correct path)
    const ffmpegPath = getFFmpegPath();
    if (!ffmpegPath) {
      reject(new Error('FFmpeg binary not found. Please reinstall dependencies.'));
      return;
    }
    
    console.log('FFmpeg path:', ffmpegPath);
    console.log('Processing:', inputPath, '->', outputPath);

    // Ensure output directory exists
    fs.mkdir(outputDir, { recursive: true })
      .then(() => {
            // Get audio duration first if we need to calculate fade start
        let probeAttempts = 0;
        const maxProbeAttempts = 2;
        
        const attemptProbe = () => {
          ffmpeg(inputPath)
            .ffprobe((err, metadata) => {
              if (err) {
                probeAttempts++;
                if (probeAttempts < maxProbeAttempts) {
                  console.log(`Probe attempt ${probeAttempts} failed, retrying...`);
                  setTimeout(attemptProbe, 500);
                  return;
                }
                reject(new Error(`Failed to read audio file (corrupted or unsupported format): ${err.message}`));
                return;
              }

              if (!metadata || !metadata.format) {
                reject(new Error('Invalid audio file metadata'));
                return;
              }

              if (!metadata.format.duration || metadata.format.duration <= 0) {
                reject(new Error('Could not determine audio duration - file may be corrupted'));
                return;
              }

            const duration = metadata.format.duration;
            let actualStartTime = startTime !== null ? startTime : 0;
            let actualEndTime = endTime !== null ? endTime : duration;
            const actualDuration = actualEndTime - actualStartTime;
            
            // Calculate fade in/out times
            let actualFadeInDuration = fadeInDuration;
            let actualFadeOutDuration = fadeOutDuration;

            // Ensure fades don't exceed audio duration
            if (actualFadeInDuration > actualDuration) {
              actualFadeInDuration = actualDuration;
            }
            if (actualFadeOutDuration > actualDuration) {
              actualFadeOutDuration = actualDuration;
            }
            if (actualFadeInDuration + actualFadeOutDuration > actualDuration) {
              // If both fades would overlap, split the duration
              const totalFade = actualFadeInDuration + actualFadeOutDuration;
              actualFadeInDuration = (actualFadeInDuration / totalFade) * actualDuration;
              actualFadeOutDuration = (actualFadeOutDuration / totalFade) * actualDuration;
            }

            // Ensure valid time range
            if (actualStartTime >= actualEndTime) {
              reject(new Error('Start time must be less than end time'));
              return;
            }

            // Build ffmpeg command
            let command = ffmpeg(inputPath);

            // Trim audio
            if (startTime !== null || endTime !== null) {
              command.seekInput(actualStartTime);
              if (endTime !== null) {
                command.duration(actualDuration);
              }
            }

            // Build audio filters array
            const audioFilters = [];
            
            // Apply fade in
            if (actualFadeInDuration > 0) {
              audioFilters.push(`afade=t=in:st=0:d=${actualFadeInDuration}`);
            }
            
            // Apply fade out
            if (actualFadeOutDuration > 0) {
              const fadeOutStart = actualDuration - actualFadeOutDuration;
              audioFilters.push(`afade=t=out:st=${fadeOutStart}:d=${actualFadeOutDuration}`);
            }
            
            // Apply volume normalization if requested
            if (normalizeVolume) {
              audioFilters.push('loudnorm=I=-16:TP=-1.5:LRA=11');
            }
            
            // Apply all audio filters
            if (audioFilters.length > 0) {
              command.audioFilters(audioFilters);
            }

            // Handle format conversion
            const finalOutputExt = outputFormat !== 'same' ? `.${outputFormat}` : outputExt;
            const finalOutputPath = outputFormat !== 'same' 
              ? outputPath.replace(outputExt, finalOutputExt)
              : outputPath;
            
            // Set codec and quality based on output format
            if (finalOutputExt === '.mp3') {
              command.audioCodec('libmp3lame');
              if (audioBitrate !== 'auto') {
                command.audioBitrate(parseInt(audioBitrate));
              } else {
                command.audioBitrate(192); // Default
              }
            } else if (finalOutputExt === '.wav') {
              // For WAV, use compressed format to reduce file size
              // Use 16-bit PCM which is standard and smaller than 32-bit
              command.audioCodec('pcm_s16le');
              // Note: WAV is uncompressed, so bitrate doesn't apply
              // But we can control sample rate
            } else if (finalOutputExt === '.flac') {
              command.audioCodec('flac');
              // FLAC is lossless, bitrate is variable
            } else if (finalOutputExt === '.m4a' || finalOutputExt === '.aac') {
              command.audioCodec('aac');
              if (audioBitrate !== 'auto') {
                command.audioBitrate(parseInt(audioBitrate));
              } else {
                command.audioBitrate(192); // Default
              }
            } else if (finalOutputExt === '.ogg') {
              command.audioCodec('libvorbis');
              if (audioBitrate !== 'auto') {
                command.audioBitrate(parseInt(audioBitrate));
              }
            }
            
            // Set sample rate if specified
            if (sampleRate !== 'auto') {
              command.audioFrequency(parseInt(sampleRate));
            } else if (finalOutputExt === '.wav') {
              // For WAV files, if auto, use 44.1 kHz default to avoid huge files
              // This prevents preserving very high sample rates (like 192 kHz) from source files
              command.audioFrequency(44100);
            } else if (finalOutputExt === '.wav') {
              // For WAV files, if auto, use a reasonable default (44.1 kHz) to avoid huge files
              // This prevents preserving very high sample rates from source files
              command.audioFrequency(44100);
            }
            
            // For other formats, let FFmpeg auto-detect

            // Output settings
            command
              .on('start', (commandLine) => {
                console.log('FFmpeg command: ' + commandLine);
              })
              .on('progress', (progress) => {
                console.log('Processing: ' + Math.round(progress.percent || 0) + '%');
              })
              .on('end', () => {
                resolve({
                  inputPath,
                  outputPath: finalOutputPath,
                  duration: actualDuration
                });
              })
              .on('error', (err) => {
                console.error('FFmpeg error:', err);
                let errorMessage = `Audio processing failed: ${err.message}`;
                
                // Provide more helpful error messages
                if (err.message.includes('Invalid data found')) {
                  errorMessage = 'File appears to be corrupted or in an unsupported format';
                } else if (err.message.includes('Permission denied')) {
                  errorMessage = 'Permission denied - check file access rights';
                } else if (err.message.includes('No such file')) {
                  errorMessage = 'Input file not found';
                } else if (err.message.includes('codec')) {
                  errorMessage = 'Codec error - file format may not be fully supported';
                }
                
                reject(new Error(errorMessage));
              })
              .save(finalOutputPath);
            });
        };
        
        attemptProbe();
      })
      .catch(reject);
  });
}

/**
 * Batch process all audio files in a directory
 * @param {string} inputDir - Input directory path
 * @param {string} outputDir - Output directory path
 * @param {number} startTime - Start time in seconds
 * @param {number} endTime - End time in seconds
 * @param {number} fadeInDuration - Fade in duration in seconds
 * @param {number} fadeOutDuration - Fade out duration in seconds
 * @param {boolean} normalizeVolume - Whether to normalize volume
 * @param {string} outputFormat - Output format ('same', 'mp3', 'wav', etc.)
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<Array>} Array of processing results
 */
async function batchProcessDirectory(inputDir, outputDir, startTime, endTime, fadeInDuration, fadeOutDuration, normalizeVolume, outputFormat, audioBitrate, sampleRate, filenamePrefix, filenameSuffix, progressCallback) {
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Supported audio formats
  const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma', '.mp4'];

  // Get all files in directory
  const files = await fs.readdir(inputDir);
  const audioFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return audioExtensions.includes(ext);
  });

  if (audioFiles.length === 0) {
    throw new Error('No audio files found in the selected directory');
  }

  const results = [];
  const total = audioFiles.length;

  for (let i = 0; i < audioFiles.length; i++) {
    const file = audioFiles[i];
    const inputPath = path.join(inputDir, file);
    const fileExt = path.extname(file);
    const fileName = path.basename(file, fileExt);

    try {
      // Report progress
      if (progressCallback) {
        progressCallback({
          current: i + 1,
          total: total,
          file: file,
          percent: Math.round(((i + 1) / total) * 100)
        });
      }

      // Determine output path with format conversion and custom prefix/suffix
      const finalExt = outputFormat !== 'same' ? `.${outputFormat}` : fileExt;
      const prefix = filenamePrefix ? String(filenamePrefix).trim() : '';
      const suffix = filenameSuffix ? String(filenameSuffix).trim() : '';
      const outputFileName = `${prefix}${fileName}${suffix}${finalExt}`;
      const finalOutputPath = path.join(outputDir, outputFileName);
      
      // Check if output would overwrite input
      if (finalOutputPath === inputPath) {
        results.push({
          inputPath,
          outputPath: finalOutputPath,
          success: false,
          error: 'Output file would overwrite input file. Please change the prefix/suffix.'
        });
        continue;
      }
      
      // Attempt processing with retry for transient errors
      let processed = false;
      let lastError = null;
      const maxRetries = 1; // One retry attempt
      
      for (let retry = 0; retry <= maxRetries && !processed; retry++) {
        try {
          if (retry > 0) {
            console.log(`Retrying file: ${file} (attempt ${retry + 1})`);
            // Small delay before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          const result = await processAudioFile(inputPath, finalOutputPath, startTime, endTime, fadeInDuration, fadeOutDuration, normalizeVolume, outputFormat, audioBitrate, sampleRate);
          results.push({ ...result, success: true });
          processed = true;
        } catch (error) {
          lastError = error;
          // Only retry on certain errors
          if (retry < maxRetries && (
            error.message.includes('temporarily') ||
            error.message.includes('timeout') ||
            error.message.includes('busy')
          )) {
            continue;
          }
          // Don't retry for validation or format errors
          break;
        }
      }
      
      if (!processed) {
        results.push({
          inputPath,
          outputPath: finalOutputPath,
          success: false,
          error: lastError ? lastError.message : 'Unknown error'
        });
      }
    } catch (error) {
      // Catch any unexpected errors
      const prefix = filenamePrefix || '';
      const suffix = filenameSuffix || '';
      const errorOutputPath = path.join(outputDir, `${prefix}${fileName}${suffix}${fileExt}`);
      results.push({
        inputPath,
        outputPath: errorOutputPath,
        success: false,
        error: error.message || 'Unexpected error during processing'
      });
    }
  }

  return results;
}

module.exports = {
  processAudioFile,
  batchProcessDirectory
};


