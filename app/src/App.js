import React, { useState, useRef, useEffect } from 'react';
import logo from './circlelogo.png';


function App() {
  const [screenshotPath, setScreenshotPath] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);


  const handleScreenshot = async () => {
    await window.electronAPI.minimizeApp();
    const filePath = await window.electronAPI.takeScreenshot();
    setScreenshotPath(filePath);
    await window.electronAPI.restoreApp();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };
  const stopRecording = async () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const buffer = await audioBlob.arrayBuffer();
        const bufferUint8Array = new Uint8Array(buffer);

        try {
          // Send the audio buffer to Electron's backend to save the file
          const transcriptionText = await window.electronAPI.saveAudio(bufferUint8Array);

          audioChunksRef.current = []; // Clear the chunks after saving

          // Check if the response is an error
          if (typeof transcriptionText === 'string') {
            setTranscription(transcriptionText);
          } else {
            setTranscription('Transcription failed or returned an unexpected result.');
          }
        } catch (error) {
          console.error('Error during audio processing:', error);
          setTranscription('An error occurred during transcription.');
        }
      };
    }
  };


  return (
    <div className=' w-screen h-screen flex items-center justify-center bg-black text-white text-center'>
      <div>
        <div className='flex items-center justify-center h-20'>
          <img src={logo} className='h-12 rounded-full mr-2 shadow-[0_0_7px_rgba(255,255,255,1)]' alt="Logo" /> {/* Adjust height and margin as needed */}
          <div className='text-5xl mb-0 font-thin font-body'>Nav AI</div>
        </div>
        {isRecording && (
          <div className="w-10 h-10 bg-red-500 rounded-full animate-pulse mx-auto mb-4" />
        )}
        <div className='flex justify-center p-2'>
          {isRecording ? (
            <button className="m-2 p-2 border border-white border-1 hover:bg-gray-600" onClick={stopRecording}>Stop</button>
          ) : (
            <button className="m-2 p-2 border border-white border-1 hover:bg-gray-600" onClick={startRecording}>Start</button>
          )}
          {/* <button onMouseDown={startRecording} onMouseUp={stopRecording} className='bg-transparent  hover:bg-white hover:text-black transition text-gray-400 rounded-s-none px-2 rounded-full flex items-center border-gray-400 border-[1px] border-s-0'>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>

          </button> */}
          <button onClick={handleScreenshot} className='bg-white text-gray-900 p-2  rounded-full ml-2'> <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
          </button>

        </div>
        {transcription && (
          <div>
            <p>{transcription}</p>
          </div>
        )}
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
