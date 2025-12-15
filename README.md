# Video Frame Extractor - Artlist Labs

A web application for extracting key frames (beginning, middle, end) from videos using the FAL AI workflow.

## Features

- 🎬 **Upload Videos** - Upload multiple video files directly
- 🔗 **Paste URLs** - Or paste video URLs for processing
- 🖼️ **Three Key Frames** - Automatically extracts beginning, middle, and end frames
- ✓ **Selective Download** - Choose individual frames or select all
- 📦 **Bulk Download** - Download all selected frames as a ZIP file
- 🎨 **Beautiful UI** - Modern, dark-themed interface

## Setup Instructions

### 1. Get Your FAL API Key

1. Sign up at [fal.ai](https://fal.ai)
2. Navigate to your API settings
3. Generate an API key
4. Copy your API key

### 2. Configure the Application

Open `app.js` and replace the FAL API key:

```javascript
const FAL_API_KEY = 'YOUR_FAL_API_KEY'; // Replace with your actual FAL API key
```

### 3. Deploy the Application

You can deploy this application using any static hosting service:

#### Option A: Local Development
```bash
# Simply open index.html in your browser
# Or use a local server:
python -m http.server 8000
# Then visit http://localhost:8000
```

#### Option B: Deploy to Netlify
1. Drag and drop the folder to [Netlify Drop](https://app.netlify.com/drop)
2. Your site will be live instantly

#### Option C: Deploy to Vercel
```bash
npm i -g vercel
vercel
```

#### Option D: GitHub Pages
1. Push to a GitHub repository
2. Enable GitHub Pages in repository settings
3. Select the main branch

## Usage

### Uploading Videos

1. Navigate to the "Video Frame Extractor" tool
2. Choose upload method:
   - **Upload Tab**: Click or drag & drop video files
   - **URL Tab**: Paste video URLs (one per line)
3. Click "Extract Frames" and wait for processing

### Selecting Frames

- Click on individual frames to select/deselect
- Use "Select All" button for a specific video
- Use the global "Select All" / "Deselect All" buttons

### Downloading

- **Single Frame**: Select one frame and click download
- **Multiple Frames**: Select multiple frames to download as ZIP
- Each frame is named: `VideoName_FrameLabel.jpg`

## FAL Workflow Integration

This application uses the FAL workflow: `workflows/Content-vlm7ci7l2p91/colby-extract-frames`

### Workflow Input
```javascript
{
  video_url: "https://example.com/video.mp4"
}
```

### Expected Output
The workflow should return frames in this format:
```javascript
{
  frames: [
    { url: "https://...", timestamp: "00:00:00" },
    { url: "https://...", timestamp: "00:00:05" },
    { url: "https://...", timestamp: "00:00:10" }
  ]
}
```

## Demo Mode

The application includes a demo mode with mock frames for testing without a FAL API key. The mock frames will be used automatically if:
- No FAL API key is configured
- The FAL API call fails

## File Structure

```
├── index.html          # Main HTML structure
├── style.css          # Styles and responsive design
├── app.js             # JavaScript logic and FAL integration
└── README.md          # This file
```

## Dependencies

All dependencies are loaded via CDN:
- **Supabase**: For future authentication (currently placeholder)
- **FAL AI Client**: For video frame extraction
- **JSZip**: For creating ZIP archives

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Troubleshooting

### Frames Not Extracting
- Verify your FAL API key is correct
- Check browser console for errors
- Ensure video URLs are publicly accessible

### Download Not Working
- Check if browser is blocking downloads
- Verify you have selected at least one frame
- Clear browser cache and try again

### CORS Issues
- Ensure video URLs support CORS
- Consider uploading videos to a CORS-enabled storage service

## Future Enhancements

- [ ] Support for custom frame positions
- [ ] Video preview before extraction
- [ ] Frame quality selection
- [ ] Batch processing queue
- [ ] Progress tracking per video
- [ ] Frame metadata (resolution, format)
- [ ] Real Supabase authentication

## License

MIT License - Feel free to use and modify

## Support

For issues with:
- **FAL Workflow**: Contact FAL.ai support
- **Application**: Create an issue in the repository
