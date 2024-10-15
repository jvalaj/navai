const { app, BrowserWindow, ipcMain } = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');
const screenshot = require('screenshot-desktop');
const OpenAI = require('openai');
const base64 = require('base64-js');

require('dotenv').config();

let mainWindow;
const createWindow = () => {
    mainWindow = new BrowserWindow({
        title: 'Nav AI',
        width: 800,
        height: 800,
        icon: "assets/circlelogo.png",
        webPreferences: {
            webSecurity: false,
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    const startUrl = url.format({
        pathname: path.join(__dirname, './app/src/index.html'),
        protocol: 'file',
        slashes: true,
    });

    mainWindow.loadURL('http://localhost:3000'); // Change to startUrl if serving from build
}

// Minimize the app
ipcMain.handle('minimize-app', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

// Restore the app
ipcMain.handle('restore-app', () => {
    if (mainWindow) {
        mainWindow.restore();
    }
});
const createDirectories = () => {
    const assetsDir = path.join(app.getPath('desktop'), 'NavAI Assets');
    const imagesDir = path.join(assetsDir, 'Images');
    const recordingsDir = path.join(assetsDir, 'Recordings');

    // Check and create directories if they do not exist
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir);
    }
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir);
    }
    if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir);
    }

    return { imagesDir, recordingsDir };
};

const { imagesDir, recordingsDir } = createDirectories();
// Take a screenshot with a delay
ipcMain.handle('take-screenshot', async () => {
    return new Promise((resolve) => {
        setTimeout(async () => {
            const filePath = path.join(imagesDir, `screenshot-${Date.now()}.png`);
            await screenshot({ filename: filePath });
            resolve(filePath);
        }, 500); // 2000 milliseconds delay (2 seconds)
    });
});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


ipcMain.handle('save-audio', async (event, audioBuffer) => {
    const audioPath = path.join(recordingsDir, `recording_${Date.now()}.wav`);
    fs.writeFileSync(audioPath, Buffer.from(audioBuffer));

    try {
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioPath),
            model: "whisper-1",
        });
        return transcription.text; // Return the transcription text

    } catch (error) {
        console.error("Error during transcription:", error);
        return error; // Return null on error
    } // Optionally, return the path to confirm the save
});

// Function to encode the image to base64
const encodeImage = (imagePath) => {
    const imageData = fs.readFileSync(imagePath);
    return imageData.toString('base64');
};

ipcMain.handle('send-ss', async (event, fPath, transcriptionText) => {
    try {
        // Ensure the file path is valid
        const resolvedPath = path.resolve(fPath);

        // Encode the image to base64
        const base64Image = encodeImage(resolvedPath);
        const prompt = `this is what the user input: "${transcriptionText}". 
        before giving a response to them, 
        analyze the image they have provided and see if that can help you respond to their input. 
        also, do not bold anything in your response.`;



        // Send the base64 image along with the transcription text to the OpenAI API
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt }, // Sending transcribed text
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/png;base64,${base64Image}` // Embedded base64 image
                            },
                        },
                    ],
                },
            ],
            max_tokens: 300, // Adjust as needed
        });

        return response.choices[0].message.content; // Return the OpenAI response

    } catch (error) {
        console.error("Error with OpenAI:", error);
        return "Error occurred during image analysis.";
    }
});


app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
