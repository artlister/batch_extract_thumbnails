// Configuration
const FAL_API_KEY = 'd11911c9-4db0-49e0-a9b1-9558d98dc26c:04fac99b361e537abbecdd98cdfd3c8e';
const FAL_WORKFLOW = 'workflows/Content-vlm7ci7l2p91/colby-extract-frames';
const FAL_API_URL = 'https://queue.fal.run';

// State
let selectedFrames = new Set();
let extractedVideos = [];

// Tool definitions
const TOOLS = [
    {
        id: 'frame-extractor',
        icon: '🎬',
        title: 'Video Frame Extractor',
        description: 'Extract beginning, middle, and end frames from your videos',
        action: () => openFrameExtractor()
    }
    // Add more tools here as needed
];

// Navigation functions
function openFrameExtractor() {
    document.getElementById('dashboard-page').classList.add('hidden');
    document.getElementById('frame-extractor-page').classList.remove('hidden');
    
    // Copy user email to tool page
    const userEmail = document.getElementById('user-email').textContent;
    document.getElementById('user-email-tool').textContent = userEmail;
}

function backToDashboard() {
    document.getElementById('frame-extractor-page').classList.add('hidden');
    document.getElementById('dashboard-page').classList.remove('hidden');
    
    // Reset the tool
    resetFrameExtractor();
}

function resetFrameExtractor() {
    selectedFrames.clear();
    extractedVideos = [];
    
    document.getElementById('processing-status').classList.add('hidden');
    document.getElementById('results-section').classList.add('hidden');
    document.getElementById('frames-container').innerHTML = '';
    document.getElementById('video-urls-input').value = '';
    
    updateSelectedCount();
}

// Input tab switching
function switchInputTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.input-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.closest('.input-tab').classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Upload area functionality
function setupUploadArea() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('video-file-input');
    
    // Click to upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File selection
    fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            await processVideoFiles(files);
        }
    });
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', async (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.type.startsWith('video/')
        );
        
        if (files.length > 0) {
            await processVideoFiles(files);
        }
    });
}

// Process video files
async function processVideoFiles(files) {
    showProcessingStatus(`Uploading ${files.length} video(s)...`);
    
    try {
        // Upload videos and get URLs
        const videoUrls = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            updateProcessingStatus(`Uploading ${file.name} (${i + 1}/${files.length})...`);
            
            // For demo purposes, we'll create object URLs
            // In production, you'd upload to a cloud storage service
            const videoUrl = URL.createObjectURL(file);
            videoUrls.push({
                url: videoUrl,
                name: file.name
            });
        }
        
        // Extract frames from all videos
        await extractFramesFromUrls(videoUrls);
        
    } catch (error) {
        console.error('Error processing videos:', error);
        alert('Error processing videos: ' + error.message);
        hideProcessingStatus();
    }
}

// Process video URLs from textarea
async function processVideoUrls() {
    const textarea = document.getElementById('video-urls-input');
    const urls = textarea.value
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (urls.length === 0) {
        alert('Please enter at least one video URL');
        return;
    }
    
    const videoUrls = urls.map((url, index) => ({
        url: url,
        name: `Video ${index + 1}`
    }));
    
    await extractFramesFromUrls(videoUrls);
}

// Extract frames using FAL API - parallel processing with progress tracking
async function extractFramesFromUrls(videoUrls) {
    // Show processing UI
    document.getElementById('processing-status').classList.remove('hidden');
    document.getElementById('results-section').classList.add('hidden');
    
    // Create progress container
    const statusContent = document.querySelector('.status-content');
    statusContent.innerHTML = `
        <div class="spinner"></div>
        <p class="status-text">Processing ${videoUrls.length} video(s)...</p>
        <div id="progress-bars" class="progress-bars-container"></div>
    `;
    
    extractedVideos = [];
    const progressBars = document.getElementById('progress-bars');
    
    // Create progress bar for each video
    const videoProgress = videoUrls.map((video, index) => {
        const progressDiv = document.createElement('div');
        progressDiv.className = 'video-progress';
        progressDiv.innerHTML = `
            <div class="video-progress-header">
                <span class="video-progress-name">${video.name}</span>
                <span class="video-progress-status" id="status-${index}">Queued</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" id="progress-${index}"></div>
            </div>
        `;
        progressBars.appendChild(progressDiv);
        
        return {
            index,
            statusEl: progressDiv.querySelector(`#status-${index}`),
            progressEl: progressDiv.querySelector(`#progress-${index}`),
            updateStatus: (status, progress = null) => {
                const statusEl = document.getElementById(`status-${index}`);
                const progressEl = document.getElementById(`progress-${index}`);
                if (statusEl) statusEl.textContent = status;
                if (progressEl && progress !== null) {
                    progressEl.style.width = `${progress}%`;
                }
            }
        };
    });
    
    try {
        // Process all videos in parallel
        const results = await Promise.all(
            videoUrls.map(async (video, index) => {
                try {
                    videoProgress[index].updateStatus('Submitting...', 10);
                    
                    // Submit job - try with video_url directly
                    const submitResponse = await fetch(`${FAL_API_URL}/${FAL_WORKFLOW}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Key ${FAL_API_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            video_url: video.url
                        })
                    });
                    
                    if (!submitResponse.ok) {
                        const errorText = await submitResponse.text();
                        console.error(`[${video.name}] Submit failed:`, submitResponse.status, errorText);
                        throw new Error(`Submit failed: ${submitResponse.status}`);
                    }
                    
                    const submitData = await submitResponse.json();
                    const statusUrl = submitData.status_url;
                    const responseUrl = submitData.response_url;
                    
                    console.log(`[${video.name}] Submitted:`, { statusUrl, responseUrl });
                    
                    videoProgress[index].updateStatus('Processing...', 20);
                    
                    // Poll for completion
                    let attempts = 0;
                    const maxAttempts = 120;
                    
                    while (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        attempts++;
                        
                        const progress = 20 + (attempts / maxAttempts) * 60;
                        videoProgress[index].updateStatus('Processing...', Math.min(progress, 85));
                        
                        const statusResponse = await fetch(statusUrl, {
                            headers: {
                                'Authorization': `Key ${FAL_API_KEY}`
                            }
                        });
                        
                        if (!statusResponse.ok) {
                            console.error(`[${video.name}] Status check failed:`, statusResponse.status);
                            continue;
                        }
                        
                        const statusData = await statusResponse.json();
                        console.log(`[${video.name}] Status:`, statusData.status);
                        
                        if (statusData.status === 'COMPLETED') {
                            videoProgress[index].updateStatus('Fetching result...', 90);
                            
                            // Try fetching result WITHOUT auth headers first (response_url is pre-signed)
                            let resultResponse = await fetch(responseUrl);
                            
                            // If that fails, try WITH auth headers
                            if (!resultResponse.ok) {
                                console.log(`[${video.name}] Trying with auth headers...`);
                                resultResponse = await fetch(responseUrl, {
                                    headers: {
                                        'Authorization': `Key ${FAL_API_KEY}`
                                    }
                                });
                            }
                            
                            if (!resultResponse.ok) {
                                const errorText = await resultResponse.text();
                                console.error(`[${video.name}] Result fetch failed:`, resultResponse.status, errorText);
                                throw new Error(`Failed to fetch result: ${resultResponse.status}`);
                            }
                            
                            const result = await resultResponse.json();
                            console.log(`[${video.name}] Result received:`, result);
                            
                            const frames = parseFramesFromResult(result);
                            
                            videoProgress[index].updateStatus('✓ Complete', 100);
                            
                            return {
                                name: video.name,
                                url: video.url,
                                frames: frames
                            };
                            
                        } else if (statusData.status === 'FAILED') {
                            throw new Error('Processing failed');
                        }
                    }
                    
                    throw new Error('Timeout');
                    
                } catch (error) {
                    console.error(`Error processing ${video.name}:`, error);
                    videoProgress[index].updateStatus('✗ Failed', 0);
                    
                    // Use mock frames as fallback
                    return {
                        name: video.name,
                        url: video.url,
                        frames: generateMockFrames(video.url)
                    };
                }
            })
        );
        
        // Store results
        extractedVideos = results;
        
        // Display results
        displayExtractedFrames();
        hideProcessingStatus();
        
    } catch (error) {
        console.error('Error in parallel processing:', error);
        alert('Error processing videos: ' + error.message);
        hideProcessingStatus();
    }
}

// Extract frames using FAL API (Direct REST API)
async function extractFramesWithFal(videoUrl) {
    try {
        console.log('Extracting frames from:', videoUrl);
        
        // Submit the job
        const submitResponse = await fetch(`${FAL_API_URL}/${FAL_WORKFLOW}`, {
            method: 'POST',
            headers: {
                'Authorization': `Key ${FAL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: {
                    video_url: videoUrl
                }
            })
        });
        
        if (!submitResponse.ok) {
            const errorText = await submitResponse.text();
            console.error('Submit error:', errorText);
            throw new Error(`FAL API error: ${submitResponse.status} ${submitResponse.statusText}`);
        }
        
        const submitData = await submitResponse.json();
        console.log('Job submitted:', submitData);
        
        // Get the request ID and status URL
        const requestId = submitData.request_id;
        const statusUrl = submitData.status_url;
        const responseUrl = submitData.response_url;
        
        if (!requestId || !statusUrl) {
            throw new Error('No request ID or status URL received from FAL');
        }
        
        // Poll for results
        let attempts = 0;
        const maxAttempts = 120; // 5 minutes max (60 * 5 seconds)
        
        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
            attempts++;
            
            const statusResponse = await fetch(statusUrl, {
                headers: {
                    'Authorization': `Key ${FAL_API_KEY}`
                }
            });
            
            if (!statusResponse.ok) {
                console.error('Status check failed:', statusResponse.status);
                continue;
            }
            
            const statusData = await statusResponse.json();
            console.log('Status check #' + attempts + ':', statusData);
            
            // Check if completed
            if (statusData.status === 'COMPLETED') {
                console.log('Job completed! Fetching result from:', responseUrl);
                
                // Fetch the actual result from response_url
                const resultResponse = await fetch(responseUrl, {
                    headers: {
                        'Authorization': `Key ${FAL_API_KEY}`
                    }
                });
                
                if (!resultResponse.ok) {
                    const errorText = await resultResponse.text();
                    console.error('Result fetch error:', resultResponse.status, errorText);
                    throw new Error(`Failed to fetch result: ${resultResponse.status}`);
                }
                
                const result = await resultResponse.json();
                console.log('FAL Result received:', result);
                
                // Extract frames from result
                return parseFramesFromResult(result);
                
            } else if (statusData.status === 'FAILED') {
                throw new Error('FAL job failed: ' + (statusData.error || 'Unknown error'));
            }
            
            // Still processing
            console.log('Job still processing... status:', statusData.status);
        }
        
        throw new Error('Processing timeout - job took too long');
        
    } catch (error) {
        console.error('FAL API Error:', error);
        console.warn('Using mock frames for demonstration');
        return generateMockFrames(videoUrl);
    }
}

// Parse frames from FAL result
function parseFramesFromResult(result) {
    console.log('Parsing result:', result);
    
    // FAL returns images, images_2, images_3 for beginning, middle, end
    if (result.images && result.images_2 && result.images_3) {
        const frames = [];
        
        // Beginning frame
        if (result.images && result.images.length > 0) {
            frames.push({
                url: result.images[0].url || result.images[0],
                label: 'Beginning',
                timestamp: null
            });
        }
        
        // Middle frame
        if (result.images_2 && result.images_2.length > 0) {
            frames.push({
                url: result.images_2[0].url || result.images_2[0],
                label: 'Middle',
                timestamp: null
            });
        }
        
        // End frame
        if (result.images_3 && result.images_3.length > 0) {
            frames.push({
                url: result.images_3[0].url || result.images_3[0],
                label: 'End',
                timestamp: null
            });
        }
        
        return frames;
    }
    
    // Fallback: Try standard structures
    if (result.frames && Array.isArray(result.frames)) {
        return result.frames.map((frame, index) => ({
            url: frame.url || frame.image_url || frame,
            label: index === 0 ? 'Beginning' : index === 1 ? 'Middle' : 'End',
            timestamp: frame.timestamp || null
        }));
    }
    
    if (result.images && Array.isArray(result.images)) {
        return result.images.map((image, index) => ({
            url: image.url || image,
            label: index === 0 ? 'Beginning' : index === 1 ? 'Middle' : 'End',
            timestamp: null
        }));
    }
    
    if (result.output) {
        // If output is an object with frames/images
        if (result.output.frames && Array.isArray(result.output.frames)) {
            return result.output.frames.map((frame, index) => ({
                url: frame.url || frame.image_url || frame,
                label: index === 0 ? 'Beginning' : index === 1 ? 'Middle' : 'End',
                timestamp: frame.timestamp || null
            }));
        }
        
        // If output is an array
        if (Array.isArray(result.output)) {
            return result.output.map((item, index) => ({
                url: item.url || item.image_url || item,
                label: index === 0 ? 'Beginning' : index === 1 ? 'Middle' : 'End',
                timestamp: item.timestamp || null
            }));
        }
    }
    
    // If the result itself is an array
    if (Array.isArray(result)) {
        return result.map((item, index) => ({
            url: item.url || item.image_url || item,
            label: index === 0 ? 'Beginning' : index === 1 ? 'Middle' : 'End',
            timestamp: null
        }));
    }
    
    // Check for common FAL response patterns
    if (result.data) {
        return parseFramesFromResult(result.data);
    }
    
    console.warn('Could not parse frames from result structure:', result);
    throw new Error('Unexpected result format');
}

// Generate mock frames for demonstration
function generateMockFrames(videoUrl) {
    // Create canvas-based placeholder images
    const frames = ['Beginning', 'Middle', 'End'];
    const colors = ['#FFD700', '#FFA500', '#FF8C00'];
    
    return frames.map((label, index) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');
        
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, colors[index]);
        gradient.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${label} Frame`, canvas.width / 2, canvas.height / 2 - 40);
        
        ctx.font = '40px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText('Demo Mode', canvas.width / 2, canvas.height / 2 + 40);
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        return {
            url: dataUrl,
            label: label,
            timestamp: `00:00:${(index * 5).toString().padStart(2, '0')}`
        };
    });
}

// Display extracted frames
function displayExtractedFrames() {
    const container = document.getElementById('frames-container');
    container.innerHTML = '';
    
    extractedVideos.forEach((video, videoIndex) => {
        const videoGroup = document.createElement('div');
        videoGroup.className = 'video-frames-group';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'video-title';
        titleDiv.innerHTML = `
            <span>🎥</span>
            <span>${video.name}</span>
            <div style="margin-left: auto; display: flex; gap: 8px;">
                <button class="btn btn-secondary" onclick="selectAllVideoFrames(${videoIndex}); event.stopPropagation();" style="padding: 8px 16px; font-size: 13px;">
                    <span>✓</span>
                    <span>Select All</span>
                </button>
                <button class="btn btn-secondary" onclick="deselectAllVideoFrames(${videoIndex}); event.stopPropagation();" style="padding: 8px 16px; font-size: 13px;">
                    <span>✗</span>
                    <span>Deselect All</span>
                </button>
            </div>
        `;
        videoGroup.appendChild(titleDiv);
        
        const framesGrid = document.createElement('div');
        framesGrid.className = 'video-frames';
        
        video.frames.forEach((frame, frameIndex) => {
            const frameId = `${videoIndex}-${frameIndex}`;
            
            const frameCard = document.createElement('div');
            frameCard.className = 'frame-card';
            frameCard.dataset.frameId = frameId;
            
            // Make entire card clickable
            frameCard.onclick = function(e) {
                // Don't toggle if clicking the checkbox itself
                if (e.target.type === 'checkbox') return;
                
                // If clicking the image or magnify button, open magnified view
                if (e.target.classList.contains('frame-image') || e.target.classList.contains('magnify-btn')) {
                    openImageMagnifier(frame.url, video.name, frame.label);
                    return;
                }
                
                const checkbox = this.querySelector('.frame-checkbox');
                checkbox.checked = !checkbox.checked;
                toggleFrameSelection(frameId, frame.url, video.name, frame.label);
            };
            
            frameCard.innerHTML = `
                <div class="frame-image-container">
                    <img src="${frame.url}" alt="${frame.label}" class="frame-image" loading="lazy" title="Click to magnify">
                    <button class="magnify-btn" title="View full size">🔍</button>
                </div>
                <div class="frame-info">
                    <span class="frame-label">${frame.label}${frame.timestamp ? ` (${frame.timestamp})` : ''}</span>
                    <input type="checkbox" class="frame-checkbox" data-frame-id="${frameId}" 
                           onclick="event.stopPropagation()" 
                           onchange="toggleFrameSelection('${frameId}', '${frame.url}', '${video.name}', '${frame.label}')">
                </div>
            `;
            
            framesGrid.appendChild(frameCard);
        });
        
        videoGroup.appendChild(framesGrid);
        container.appendChild(videoGroup);
    });
    
    document.getElementById('results-section').classList.remove('hidden');
}

// Toggle frame selection
function toggleFrameSelection(frameId, frameUrl, videoName, frameLabel) {
    const checkbox = document.querySelector(`input[data-frame-id="${frameId}"]`);
    const frameCard = document.querySelector(`.frame-card[data-frame-id="${frameId}"]`);
    
    if (checkbox.checked) {
        selectedFrames.add(JSON.stringify({ frameId, frameUrl, videoName, frameLabel }));
        frameCard.classList.add('selected');
    } else {
        selectedFrames.delete(JSON.stringify({ frameId, frameUrl, videoName, frameLabel }));
        frameCard.classList.remove('selected');
    }
    
    updateSelectedCount();
}

// Select all frames for a specific video
function selectAllVideoFrames(videoIndex) {
    const video = extractedVideos[videoIndex];
    
    video.frames.forEach((frame, frameIndex) => {
        const frameId = `${videoIndex}-${frameIndex}`;
        const checkbox = document.querySelector(`input[data-frame-id="${frameId}"]`);
        const frameCard = document.querySelector(`.frame-card[data-frame-id="${frameId}"]`);
        
        if (!checkbox.checked) {
            checkbox.checked = true;
            frameCard.classList.add('selected');
            selectedFrames.add(JSON.stringify({ 
                frameId, 
                frameUrl: frame.url, 
                videoName: video.name, 
                frameLabel: frame.label 
            }));
        }
    });
    
    updateSelectedCount();
}

// Deselect all frames for a specific video
function deselectAllVideoFrames(videoIndex) {
    const video = extractedVideos[videoIndex];
    
    video.frames.forEach((frame, frameIndex) => {
        const frameId = `${videoIndex}-${frameIndex}`;
        const checkbox = document.querySelector(`input[data-frame-id="${frameId}"]`);
        const frameCard = document.querySelector(`.frame-card[data-frame-id="${frameId}"]`);
        
        if (checkbox.checked) {
            checkbox.checked = false;
            frameCard.classList.remove('selected');
            selectedFrames.delete(JSON.stringify({ 
                frameId, 
                frameUrl: frame.url, 
                videoName: video.name, 
                frameLabel: frame.label 
            }));
        }
    });
    
    updateSelectedCount();
}

// Open image magnifier/lightbox
function openImageMagnifier(imageUrl, videoName, frameLabel) {
    const lightbox = document.getElementById('lightboxModal');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxVideo = document.getElementById('lightboxVideo');
    const lightboxPrompt = document.getElementById('lightboxPrompt');
    const lightboxMeta = document.getElementById('lightboxMeta');
    
    // Hide video, show image
    lightboxVideo.style.display = 'none';
    lightboxImage.style.display = 'block';
    lightboxImage.src = imageUrl;
    
    // Set metadata
    lightboxPrompt.textContent = '';
    lightboxMeta.textContent = `${videoName} - ${frameLabel}`;
    
    // Show lightbox
    lightbox.classList.add('show');
    
    // Setup download button
    document.getElementById('lightboxDownload').onclick = () => {
        downloadSingleFrameFromUrl(imageUrl, videoName, frameLabel);
    };
}

// Close lightbox
function closeLightbox() {
    document.getElementById('lightboxModal').classList.remove('show');
}

// Download single frame from URL
async function downloadSingleFrameFromUrl(url, videoName, frameLabel) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${sanitizeFilename(videoName)}_${frameLabel}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error('Error downloading frame:', error);
        alert('Error downloading frame');
    }
}

// Deselect all frames for a specific video
function deselectAllVideoFrames(videoIndex) {
    const video = extractedVideos[videoIndex];
    
    video.frames.forEach((frame, frameIndex) => {
        const frameId = `${videoIndex}-${frameIndex}`;
        const checkbox = document.querySelector(`input[data-frame-id="${frameId}"]`);
        const frameCard = document.querySelector(`.frame-card[data-frame-id="${frameId}"]`);
        
        if (checkbox.checked) {
            checkbox.checked = false;
            frameCard.classList.remove('selected');
            
            // Remove from selectedFrames
            for (let item of selectedFrames) {
                const parsed = JSON.parse(item);
                if (parsed.frameId === frameId) {
                    selectedFrames.delete(item);
                    break;
                }
            }
        }
    });
    
    updateSelectedCount();
}

// Open image magnifier
function openImageMagnifier(imageUrl, videoName, frameLabel) {
    const magnifier = document.getElementById('image-magnifier');
    const magnifierImg = document.getElementById('magnifier-image');
    const magnifierInfo = document.getElementById('magnifier-info');
    
    magnifierImg.src = imageUrl;
    magnifierInfo.innerHTML = `
        <div style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">${videoName}</div>
        <div style="font-size: 14px; color: rgba(255, 215, 0, 0.9);">${frameLabel} Frame</div>
    `;
    
    magnifier.classList.add('show');
    
    // Prevent body scroll when magnifier is open
    document.body.style.overflow = 'hidden';
}

// Close image magnifier
function closeImageMagnifier() {
    const magnifier = document.getElementById('image-magnifier');
    magnifier.classList.remove('show');
    
    // Restore body scroll
    document.body.style.overflow = '';
}

// Select all frames
function selectAllFrames() {
    document.querySelectorAll('.frame-checkbox').forEach(checkbox => {
        if (!checkbox.checked) {
            checkbox.checked = true;
            const frameCard = checkbox.closest('.frame-card');
            frameCard.classList.add('selected');
            
            const frameId = checkbox.dataset.frameId;
            const [videoIndex, frameIndex] = frameId.split('-').map(Number);
            const video = extractedVideos[videoIndex];
            const frame = video.frames[frameIndex];
            
            selectedFrames.add(JSON.stringify({ 
                frameId, 
                frameUrl: frame.url, 
                videoName: video.name, 
                frameLabel: frame.label 
            }));
        }
    });
    
    updateSelectedCount();
}

// Deselect all frames
function deselectAllFrames() {
    document.querySelectorAll('.frame-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        const frameCard = checkbox.closest('.frame-card');
        frameCard.classList.remove('selected');
    });
    
    selectedFrames.clear();
    updateSelectedCount();
}

// Update selected count
function updateSelectedCount() {
    document.getElementById('selected-count').textContent = selectedFrames.size;
}

// Download selected frames
async function downloadSelected() {
    if (selectedFrames.size === 0) {
        alert('Please select at least one frame to download');
        return;
    }
    
    const frames = Array.from(selectedFrames).map(f => JSON.parse(f));
    
    if (frames.length === 1) {
        // Download single frame directly
        await downloadSingleFrame(frames[0]);
    } else {
        // Download as ZIP
        await downloadAsZip(frames);
    }
}

// Download single frame
async function downloadSingleFrame(frame) {
    try {
        const response = await fetch(frame.frameUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sanitizeFilename(frame.videoName)}_${frame.frameLabel}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading frame:', error);
        alert('Error downloading frame');
    }
}

// Download frames as ZIP
async function downloadAsZip(frames) {
    try {
        const zip = new JSZip();
        
        // Show a simple loading indicator
        const downloadBtn = document.getElementById('download-btn');
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<span>⏳</span><span>Creating ZIP...</span>';
        downloadBtn.disabled = true;
        
        // Add each frame to ZIP
        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            
            try {
                const response = await fetch(frame.frameUrl);
                const blob = await response.blob();
                const filename = `${sanitizeFilename(frame.videoName)}_${frame.frameLabel}.jpg`;
                zip.file(filename, blob);
            } catch (error) {
                console.error(`Error adding frame ${frame.frameId}:`, error);
            }
        }
        
        // Generate ZIP
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        // Download ZIP
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video_frames_${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Restore button
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
        
    } catch (error) {
        console.error('Error creating ZIP:', error);
        alert('Error creating ZIP file: ' + error.message);
        
        // Restore button
        const downloadBtn = document.getElementById('download-btn');
        downloadBtn.innerHTML = '<span>⬇️</span><span>Download Selected (<span id="selected-count">' + selectedFrames.size + '</span>)</span>';
        downloadBtn.disabled = false;
    }
}

// Sanitize filename
function sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9_\-]/gi, '_').substring(0, 50);
}

// Processing status helpers
function showProcessingStatus(message) {
    const statusDiv = document.getElementById('processing-status');
    statusDiv.classList.remove('hidden');
    
    const statusContent = statusDiv.querySelector('.status-content');
    statusContent.innerHTML = `
        <div class="spinner"></div>
        <p class="status-text">Processing videos...</p>
        <p class="status-subtext" id="status-detail">${message}</p>
    `;
    
    document.getElementById('results-section').classList.add('hidden');
}

function updateProcessingStatus(message) {
    const statusDetail = document.getElementById('status-detail');
    if (statusDetail) {
        statusDetail.textContent = message;
    }
}

function hideProcessingStatus() {
    document.getElementById('processing-status').classList.add('hidden');
}

// Load tools on dashboard
function loadTools() {
    const toolsGrid = document.getElementById('tools-grid');
    toolsGrid.innerHTML = '';
    
    TOOLS.forEach(tool => {
        const toolCard = document.createElement('div');
        toolCard.className = 'tool-card';
        toolCard.onclick = tool.action;
        
        toolCard.innerHTML = `
            <div class="tool-icon">${tool.icon}</div>
            <h3>${tool.title}</h3>
            <p>${tool.description}</p>
            <div class="tool-arrow">→</div>
        `;
        
        toolsGrid.appendChild(toolCard);
    });
}

// Auth placeholder functions
function showLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('signup-form').classList.add('hidden');
    document.getElementById('forgot-password-form').classList.add('hidden');
    
    document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.auth-tab')[0].classList.add('active');
}

function showSignup() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('signup-form').classList.remove('hidden');
    document.getElementById('forgot-password-form').classList.add('hidden');
    
    document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.auth-tab')[1].classList.add('active');
}

function showForgotPassword() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('signup-form').classList.add('hidden');
    document.getElementById('forgot-password-form').classList.remove('hidden');
}

function signInWithGoogle() {
    // Simulate login for demo
    simulateLogin('demo@artlist.io');
}

function simulateLogin(email) {
    // Hide auth page, show dashboard
    document.getElementById('auth-page').classList.add('hidden');
    document.getElementById('dashboard-page').classList.remove('hidden');
    
    // Set user email
    document.getElementById('user-email').textContent = email;
    
    // Load tools
    loadTools();
}

function logout() {
    document.getElementById('dashboard-page').classList.add('hidden');
    document.getElementById('frame-extractor-page').classList.add('hidden');
    document.getElementById('auth-page').classList.remove('hidden');
    
    // Reset state
    resetFrameExtractor();
}

// Lightbox and modal placeholder functions
function openAllGenerations() {
    console.log('Open all generations modal');
}

function closeAllGenerations() {
    document.getElementById('allGenerationsModal').classList.remove('show');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Setup upload area
    setupUploadArea();
    
    // Setup auth form handlers (placeholder)
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        simulateLogin(email);
    });
    
    document.getElementById('signup-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        simulateLogin(email);
    });
    
    // Auto-login for demo (remove in production)
    setTimeout(() => {
        simulateLogin('demo@artlist.io');
    }, 500);
});