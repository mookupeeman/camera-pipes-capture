const CLIENT_ID = '594274957992-ev098ch3cl1m1n7oc15nvmlkkkaj5o8e.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'Prince_Pipes__Mobile_Captures';

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const captureButton = document.getElementById('captureButton');
const authorizeButton = document.getElementById('authorizeButton');
const capturedCanvas = document.getElementById('capturedCanvas');
const capturedContext = capturedCanvas.getContext('2d');
const captureStatus = document.getElementById('captureStatus');

let tokenClient;
let gapiInited = false;
let gisInited = false;
let imageCounter = 0;

function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
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
    imageCounter++;
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

    const originalImageURL = canvas.toDataURL('image/png');
    const croppedImageURL = capturedCanvas.toDataURL('image/png');

    uploadImageToDrive(originalImageURL, `image_${imageCounter}_original`);
    uploadImageToDrive(croppedImageURL, `image_${imageCounter}_cropped`);

    captureStatus.textContent = "Images have been captured and are being uploaded...";
});

async function getOrCreateFolder() {
    try {
        let response = await gapi.client.drive.files.list({
            q: `mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`,
            fields: 'files(id, name)'
        });

        let files = response.result.files;
        if (files && files.length > 0) {
            return files[0].id;
        } else {
            let folderMetadata = {
                name: FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder'
            };
            let folder = await gapi.client.drive.files.create({
                resource: folderMetadata,
                fields: 'id'
            });
            return folder.result.id;
        }
    } catch (err) {
        console.error('Error creating/finding folder:', err);
        throw err;
    }
}

async function uploadImageToDrive(imageDataUrl, fileName) {
    try {
        const folderId = '13VlMerTuMhIhnYLKz-yGXeU_eVgqwa6b'

        const byteString = atob(imageDataUrl.split(',')[1]);
        const mimeString = imageDataUrl.split(',')[0].split(':')[1].split(';')[0];
        const buffer = new ArrayBuffer(byteString.length);
        const uintArray = new Uint8Array(buffer);

        for (let i = 0; i < byteString.length; i++) {
            uintArray[i] = byteString.charCodeAt(i);
        }

        const blob = new Blob([buffer], { type: mimeString });

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify({
            name: `${fileName}.png`,
            mimeType: 'image/png',
            parents: [folderId]
        })], { type: 'application/json' }));
        form.append('file', blob);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', true);
        xhr.setRequestHeader('Authorization', 'Bearer ' + gapi.auth.getToken().access_token);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                const response = JSON.parse(xhr.responseText);
                if (xhr.status === 200) {
                    console.log('File uploaded successfully, ID:', response.id);
                    captureStatus.textContent = "Images have been captured and uploaded successfully!";
                } else {
                    console.error('Error uploading file:', xhr.responseText);
                    captureStatus.textContent = "Error uploading images. Please try again.";
                }
            }
        };
        xhr.send(form);

    } catch (err) {
        console.error('Error uploading file:', err);
        captureStatus.textContent = "Error uploading images. Please try again.";
    }
}

// These functions should be called when the respective scripts are loaded
// gapiLoaded();
// gisLoaded();
