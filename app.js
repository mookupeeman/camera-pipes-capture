// Get the elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const captureButton = document.getElementById('captureButton');
const downloadLink = document.createElement('a');
downloadLink.innerText = 'Download Cropped Image';
downloadLink.style.display = 'none';
document.body.appendChild(downloadLink);

const capturedCanvas = document.createElement('canvas');
const capturedContext = capturedCanvas.getContext('2d');
document.body.appendChild(capturedCanvas);

// Access the user's camera
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;

        // Once the video is playing, draw the rectangle
        video.addEventListener('loadedmetadata', () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            drawRectangleOnVideo();
        });

    } catch (error) {
        console.error('Error accessing the camera: ', error);
    }
}

// Draw the rectangle on the video feed
function drawRectangleOnVideo() {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;

    // Calculate crop dimensions
    const cropWidth = width * 0.8;
    const cropHeight = height * 0.8;

    // Calculate the starting point
    const startX = (width - cropWidth) / 2;
    const startY = (height - cropHeight) / 2;

    // Draw the rectangle on the video stream
    context.strokeStyle = 'red';
    context.lineWidth = 2;
    context.strokeRect(startX, startY, cropWidth, cropHeight);

    // Continuously update the rectangle as the video feed changes
    requestAnimationFrame(drawRectangleOnVideo);
}

// Capture the image from the video stream
captureButton.addEventListener('click', () => {
    // Set the canvas size to the video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current frame of the video onto the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;

    // Calculate crop dimensions
    const cropWidth = width * 0.8;
    const cropHeight = height * 0.8;

    // Calculate the starting point
    const startX = (width - cropWidth) / 2;
    const startY = (height - cropHeight) / 2;

    // Get the cropped image data
    const croppedImageData = context.getImageData(startX, startY, cropWidth, cropHeight);

    // Set up the captured canvas to display the cropped image
    capturedCanvas.width = cropWidth;
    capturedCanvas.height = cropHeight;
    capturedContext.putImageData(croppedImageData, 0, 0);

    // Convert the captured canvas to a data URL
    const croppedImageURL = capturedCanvas.toDataURL('image/png');

    // Set up the download link
    downloadLink.href = croppedImageURL;
    downloadLink.download = 'cropped_image.png';
    downloadLink.style.display = 'block';

    // Optionally, save to a folder using backend integration (not covered here)
});

// Start the camera on page load
startCamera();
