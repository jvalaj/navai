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
    <div className={`w-screen h-screen ${llogo ? 'flex' : ''} bg-gradient-to-br from-white via-blue-50 to-blue-100 items-center justify-center text-gray-800 text-center transition-colors duration-300`}>
      <div className="max-w-lg w-full mx-auto p-6 rounded-3xl shadow-2xl bg-white/90 backdrop-blur-md">
        {llogo ? (
          <div className='flex items-center justify-center h-20 mb-6'>
            <img src={logo} className='h-14 rounded-full mr-4 shadow-[0_0_16px_rgba(0,120,255,0.25)] border-2 border-blue-200' alt="Logo" />
            <div className='text-5xl font-light font-body tracking-tight text-blue-700 drop-shadow'>Nav AI</div>
          </div>
        ) : null}

        {transcription && (
          <div className='mt-5'>
            <p className="text-lg text-blue-700 font-medium">{transcription}</p>
          </div>
        )}

        <div className='flex justify-center p-2 gap-4'>
          {isRecording ? (
            <button
              className="m-2 p-3 flex items-center gap-2 border-none rounded-full bg-red-500/90 shadow-lg hover:bg-red-400 transition"
              onClick={stopRecording}
              title="Stop Recording"
            >
              <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
            </button>
          ) : (
            <button
              className="m-2 px-6 py-2 rounded-full bg-blue-500 text-white font-semibold shadow hover:bg-blue-400 transition"
              onClick={startRecording}
              title="Start Recording"
            >
              TALK
            </button>
          )}

          {transcription && (
            <button
              onClick={handleScreenshot}
              className='bg-gradient-to-r from-blue-400 to-green-300 m-2 text-white px-6 py-2 rounded-full font-semibold shadow hover:from-blue-500 hover:to-green-400 transition'
              title="Take Screenshot"
            >
              SNIP
            </button>
          )}
        </div>

        {screenshotPath && (
          <div className="mt-5 flex justify-center">
            <img src={screenshotPath} alt="Screenshot" className="rounded-xl mt-2 shadow-lg border border-blue-100" style={{ maxHeight: '200px' }} />
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center mt-6">
            <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {responseFromOpenAI && (
          <div className="text-left p-4 mt-6 border border-blue-100 rounded-2xl bg-blue-50/70 text-blue-900 shadow">
            {responseFromOpenAI
              .split('\n')
              .map((line, index) => (
                <p
                  key={index}
                  className="mb-2"
                  dangerouslySetInnerHTML={{
                    __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                  }}
                ></p>
              ))}
          </div>
        )}


      </div>
    </div >
  );
}

export default App;
