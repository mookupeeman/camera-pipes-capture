const CLIENT_ID = 'YOUR_CLIENT_ID'; // Replace with your actual client ID
const API_KEY = 'YOUR_API_KEY'; // Replace with your actual API key
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const captureButton = document.getElementById('captureButton');
const authorizeButton = document.getElementById('authorizeButton');
const capturedCanvas = document.getElementById('capturedCanvas');
const capturedContext = capturedCanvas.getContext('2d');

let tokenClient;
let gapiInited = false;
let gisInited = false;

function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    });
    gapiInited = true;
    maybeEnableButtons();
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        authorizeButton.style.display = 'block';
    }
}

authorizeButton.onclick = () => {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        authorizeButton.style.display = 'none';
        captureButton.style.display = 'block';
        await startCamera();
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
};

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;

        video.addEventListener('loadedmetadata', () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            drawRectangleOnVideo();
        });

    } catch (error) {
        console.error('Error accessing the camera: ', error);
    }
}

function drawRectangleOnVideo() {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;

    const cropWidth = width * 0.8;
    const cropHeight = height * 0.8;

    const startX = (width - cropWidth) / 2;
    const startY = (height - cropHeight) / 2;

    context.strokeStyle = 'red';
    context.lineWidth = 2;
    context.strokeRect(startX, startY, cropWidth, cropHeight);

    requestAnimationFrame(drawRectangleOnVideo);
}

captureButton.addEventListener('click', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;

    const cropWidth = width * 0.8;
    const cropHeight = height * 0.8;

    const startX = (width - cropWidth) / 2;
    const startY = (height - cropHeight) / 2;

    const croppedImageData = context.getImageData(startX, startY, cropWidth, cropHeight);

    capturedCanvas.width = cropWidth;
    capturedCanvas.height = cropHeight;
    capturedContext.putImageData(croppedImageData, 0, 0);

    const croppedImageURL = capturedCanvas.toDataURL('image/png');

    uploadImageToDrive(croppedImageURL);
});

function uploadImageToDrive(imageDataUrl) {
    const byteString = atob(imageDataUrl.split(',')[1]);
    const mimeString = imageDataUrl.split(',')[0].split(':')[1].split(';')[0];
    const buffer = new ArrayBuffer(byteString.length);
    const uintArray = new Uint8Array(buffer);

    for (let i = 0; i < byteString.length; i++) {
        uintArray[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([buffer], { type: mimeString });
    const metadata = {
        name: 'captured_image_' + new Date().toISOString() + '.png',
        mimeType: mimeString,
    };

    gapi.client.drive.files.create({
        resource: metadata,
        media: {
            mimeType: mimeString,
            body: blob
        },
        fields: 'id'
    }).then(function(response) {
        console.log('File uploaded, ID: ', response.result.id);
    }, function(error) {
        console.error('Error uploading file: ' + error);
    });
}

// These function calls should be in the HTML, not in the script
// gapiLoaded();
