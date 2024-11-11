const { app, BrowserWindow, ipcMain, screen } = require('electron');
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

    mainWindow.loadURL('http://localhost:3000');

    // Change to startUrl if serving from build
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
        setTimeout(() => {
            const { width, height } = screen.getPrimaryDisplay().workAreaSize;
            mainWindow.setBounds({
                x: width - 400,  // Move window to the right
                y: 0,            // Align to the top
                width: 400,      // Make window square (400x400)
                height: 600,
            });
        }, 20);
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

        }, 1000); // 2000 milliseconds delay (2 seconds)
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
        const prompt = `you are an assistant that provides steps when the user gives you an image and an input text.
            also, do not bold anything in your response. meaning, do not add any * symbols in your response.
             you are supposed to tell them the steps they need to follow based on what the image provided shows you to achieve the task they have asked help in.
            this is what the user input: "${transcriptionText}". 
            before giving a response to them, please see if they input is something new or you are continuing the conversation about a previous task.
            analyze the image and see if that has anything to do with their input. 
           `;




        // Send the base64 image along with the transcription text to the OpenAI API
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
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
