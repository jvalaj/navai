import React, { useState, useRef } from 'react';
import logo from './circlelogo.png';
import Lame from 'lamejs';
import fs from '../node_modules/fs';
import OpenAI from 'openai';
import path from 'path'
import {writeFile} from 'fs';

function App() {
  const [screenshotPath, setScreenshotPath] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('')
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);


  const handleScreenshot = async () => {
    await window.electronAPI.minimizeApp();
    const filePath = await window.electronAPI.takeScreenshot();
    setScreenshotPath(filePath);
    await window.electronAPI.restoreApp();
  };

  const startRecording = async () => {
    console.log("Recording started");
    setIsRecording(true);
    audioChunksRef.current = []; // Clear previous audio chunks

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);

        mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data); // Store audio chunks
        };

        mediaRecorderRef.current.onstop = async () => {
            console.log("Recording stopped");
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
            const mp3Blob = await convertBlobToMp3(audioBlob); // Convert the Blob to MP3
            const mp3FilePath = await saveMp3File(mp3Blob); // Save the MP3 file
            await uploadAudio(mp3FilePath); // Call upload function here
        };

        mediaRecorderRef.current.start();
    } catch (error) {
        console.error('Error accessing microphone:', error);
        setIsRecording(false); // Reset state on error
    }
};

const stopRecording = () => {
    console.log("Stopping recording...");
    setIsRecording(false);
    if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop(); // This will trigger the onstop event
    }
};

const convertBlobToMp3 = async (audioBlob) => {
    const arrayBuffer = await audioBlob.arrayBuffer(); // Get ArrayBuffer from Blob
    const audioBuffer = await new AudioContext().decodeAudioData(arrayBuffer); // Decode audio data

    // Create a new MP3 encoder
    const mp3Encoder = new Lame.Mp3Encoder(audioBuffer.numberOfChannels, audioBuffer.sampleRate, 128);

    const mp3Data = [];

    const samples = audioBuffer.getChannelData(0); // Get audio data from the first channel
    const chunkSize = 1152; // LameJS chunk size

    for (let i = 0; i < samples.length; i += chunkSize) {
        const sampleChunk = samples.subarray(i, i + chunkSize);
        const mp3Chunk = mp3Encoder.encodeBuffer(sampleChunk); // Encode the audio to MP3
        if (mp3Chunk.length > 0) {
            mp3Data.push(new Uint8Array(mp3Chunk));
        }
    }

    const mp3EndChunk = mp3Encoder.flush(); // Finalize the encoding
    if (mp3EndChunk.length > 0) {
        mp3Data.push(new Uint8Array(mp3EndChunk));
    }

    return new Blob(mp3Data, { type: 'audio/mp3' }); // Create a Blob from the MP3 data
};

const saveMp3File = async (mp3Blob) => {
    const mp3FilePath = path.join(__dirname, 'audio.mp3'); // Change this to your desired path
    const arrayBuffer = await mp3Blob.arrayBuffer(); // Convert Blob to ArrayBuffer

    writeFile(mp3FilePath, Buffer.from(arrayBuffer), (err) => {
        if (err) throw err;
        console.log('MP3 file saved at', mp3FilePath);
    });

    return mp3FilePath; // Return the file path for the upload
};

  const uploadAudio = async (mp3FilePath) => {
      const openai = new OpenAI();
      try {
        const response = await openai.audio.transcriptions.create({
          file: fs.createReadStream(mp3FilePath),
          model: 'whisper-1'
        })
  
        console.log("Transcription response:", response.text);
        setTranscription(response.text);
    } catch (error) {
      console.error('Error transcribing audio:', error);
    }
  };

  return (
    <div className=' w-screen h-screen flex items-center justify-center bg-black text-white text-center'>
      <div>
        <div className='flex items-center justify-center h-20'>
          <img src={logo} className='h-12 rounded-full mr-2 shadow-[0_0_7px_rgba(255,255,255,1)]' alt="Logo" /> {/* Adjust height and margin as needed */}
          <div className='text-5xl mb-0 font-thin font-body'>Nav AI</div>
        </div>
        <div className='flex justify-center p-2'>
          <input value={transcription} onChange={(e) => setTranscription(e.target.value)} className='w-1/2 p-2 rounded-full rounded-e-none px-3 mr-0 bg-transparent border-gray-400 border-[1px] border-e-0' placeholder='Type a task' />
          <button onMouseDown={startRecording} onMouseUp={stopRecording} className='bg-transparent  hover:bg-white hover:text-black transition text-gray-400 rounded-s-none px-2 rounded-full flex items-center border-gray-400 border-[1px] border-s-0'>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>

          </button>
          <button onClick={handleScreenshot} className='bg-white rounded-full text-gray-900 p-2  rounded-full ml-2'> <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
          </button>

        </div>



        {screenshotPath && (
          <div className="mt-5">

            <img src={screenshotPath} alt="Screenshot" className="rounded-lg mt-2" />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
