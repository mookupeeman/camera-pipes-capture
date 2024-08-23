// Google API variables
const CLIENT_ID = '594274957992-ev098ch3cl1m1n7oc15nvmlkkkaj5o8e.apps.googleusercontent.com'; // Replace with your actual Client ID
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let gapiInited = false;

// Load the Google API client
function loadClient() {
    gapi.load('client:auth2', initializeGapiClient);
}

// Initialize the Google API client
function initializeGapiClient() {
    gapi.client.init({
        clientId: CLIENT_ID,
        scope: SCOPES,
    }).then(() => {
        gapiInited = true;
        handleAuthClick();  // Automatically trigger the authorization
    });
}

// Handle Google Drive authorization
function handleAuthClick() {
    gapi.auth2.getAuthInstance().signIn().then(() => {
        console.log('Authorization successful!');
    }, (error) => {
        console.error('Authorization failed: ', error);
    });
}

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

    // Create a temporary canvas to draw the cropped image
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;
    const croppedContext = croppedCanvas.getContext('2d');
    croppedContext.putImageData(croppedImageData, 0, 0);

    // Convert the cropped canvas to a data URL
    const croppedImageURL = croppedCanvas.toDataURL('image/png');

    // Set up the download link
    downloadLink.href = croppedImageURL;
    downloadLink.download = 'cropped_image.png';
    downloadLink.style.display = 'block';

    // Upload the image to Google Drive
    uploadToGoogleDrive(croppedImageURL);
});

// Upload the image to Google Drive
function uploadToGoogleDrive(imageDataURL) {
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const contentType = 'image/png';
    const metadata = {
        'name': 'captured_image.png',
        'mimeType': contentType
    };

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' + contentType + '\r\n' +
        '\r\n' +
        imageDataURL.split(',')[1] +
        close_delim;

    const request = gapi.client.request({
        'path': '/upload/drive/v3/files',
        'method': 'POST',
        'params': {'uploadType': 'multipart'},
        'headers': {
            'Content-Type': 'multipart/related; boundary="' + boundary + '"'
        },
        'body': multipartRequestBody
    });

    request.execute((file) => {
        console.log('File uploaded successfully to Google Drive', file);
    });
}

// Start the camera and initialize the Google API on page load
window.onload = () => {
    startCamera();
    loadClient();
};
