import React, { useState, useRef, useEffect } from 'react';
import logo from './circlelogo.png';


function App() {
  const [screenshotPath, setScreenshotPath] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const mediaRecorderRef = useRef(null);
  const [llogo, setLogo] = useState(true)
  const audioChunksRef = useRef([]);
  const [responseFromOpenAI, setResponseFromOpenAI] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const handleScreenshot = async () => {
    await window.electronAPI.minimizeApp();
    const filePath = await window.electronAPI.takeScreenshot();
    setScreenshotPath(filePath);
    setLogo(false);
    await window.electronAPI.restoreApp();
    handleSendToOpenAI(filePath, transcription);
  };

  const startRecording = async () => {
    setResponseFromOpenAI()
    setTranscription()
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

  const handleSendToOpenAI = async (fPath, transcriptionText) => {
    if (fPath && transcriptionText) {
      setIsLoading(true);
      try {
        const response = await window.electronAPI.sendSS(fPath, transcriptionText);
        setResponseFromOpenAI(response);
        setIsLoading(false);
        setTranscription()
        setScreenshotPath()
      } catch (error) {
        console.error('Error during communication with OpenAI: sending SS', error);
        setIsLoading(false);
      }
    }
  };

  return (
    <div className={`w-screen h-screen  ${llogo ? 'flex ' : ''} bg-black items-center justify-center text-white text-center`}>
      <div>
        {llogo ? <div className='flex items-center justify-center h-20'>
          <img src={logo} className='h-12 rounded-full mr-2 shadow-[0_0_7px_rgba(255,255,255,1)]' alt="Logo" />{/* Adjust height and margin as needed */}
          <div className='text-5xl mb-0 font-thin font-body'>Nav AI</div>
        </div> : ""}


        {transcription && (
          <div className='mt-5'>
            <p>{transcription}</p>
          </div>
        )}
        <div className='flex justify-center p-2'>
          {isRecording ? (
            <button className="m-2 p-2 flex items-center gap-2 border rounded-full border-white border-1 hover:bg-gray-600" onClick={stopRecording}>
              <div className="w-5 h-5 bg-red-500 rounded-full animate-pulse" /> {/* Circular dot */}


            </button>
          ) : (
            <button className="m-2 p-2 border rounded-full opacity-90 border-white border-1 hover:bg-gray-600" onClick={startRecording}>ask for guidance </button>
          )}

          {transcription && (
            <button onClick={handleScreenshot} className='bg-white m-2 text-black p-2 rounded-full'>
              take screenshot, send
            </button>
          )}

        </div>


        {screenshotPath && (
          <div className="mt-5">
            {/* Restrict image height */}
            <img src={screenshotPath} alt="Screenshot" className="rounded-lg mt-2" style={{ maxHeight: '200px' }} />
          </div>
        )}

        {isLoading && (
          <div className="text-white animate-spin mt-4">0</div> // Loading visual
        )}

        {responseFromOpenAI && (
          <div className="text-left p-4 border border-gray-600  rounded-md text-white">
            {/* Splitting sentences into paragraphs */}
            {responseFromOpenAI.split('\n').map((line, index) => (
              <p key={index} className="mb-2">{line}</p>
            ))}
          </div>
        )}

      </div>
    </div >
  );
}

export default App;
