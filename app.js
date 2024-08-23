<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Camera Capture with Google Drive</title>
</head>
<body>
    <h1>Camera Capture with Cropping and Google Drive Upload</h1>
    <button id="authorizeButton" style="display: none;">Authorize Google Drive</button>
    <video id="video" autoplay style="display: block; margin-bottom: 10px;"></video>
    <canvas id="canvas" style="display: block; margin-bottom: 10px;"></canvas>
    <button id="captureButton" style="display: none;">Capture and Upload Image</button>
    <canvas id="capturedCanvas" style="display: block; margin-top: 10px;"></canvas>
    
    <script>
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

        let tokenClient;
        let gapiInited = false;
        let gisInited = false;

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

        async function uploadImageToDrive(imageDataUrl) {
            try {
                const folderId = await getOrCreateFolder();

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
                    parents: [folderId]
                };

                let response = await gapi.client.drive.files.create({
                    resource: metadata,
                    media: {
                        mimeType: mimeString,
                        body: blob
                    },
                    fields: 'id'
                });

                console.log('File uploaded, ID:', response.result.id);
            } catch (err) {
                console.error('Error uploading file:', err);
            }
        }
    </script>

    <script async defer src="https://apis.google.com/js/api.js" onload="gapiLoaded()"></script>
    <script async defer src="https://accounts.google.com/gsi/client" onload="gisLoaded()"></script>
</body>
</html>
