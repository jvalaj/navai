import React, { useState } from 'react';

function App() {
  const [screenshotPath, setScreenshotPath] = useState('');
  const handleScreenshot = async () => {
    await window.electronAPI.minimizeApp();
    const filePath = await window.electronAPI.takeScreenshot();
    setScreenshotPath(filePath);
    await window.electronAPI.restoreApp();
  };

  return (
    <div className='font-body w-screen h-screen flex items-center justify-center bg-black text-white text-center'>
      <div>
        <div>
          <p className=' text-5xl mb-5 font-body'>Nav AI</p>
          <img src="../assets/circlelogo.png" />


        </div>
        <div>
          <input className='w-1/2 rounded-xl p-1 px-2 m-1 text-black' placeholder='Type a task' />
          <button onClick={handleScreenshot} className='bg-gray-600 text-white p-1 px-2 rounded-xl'>Go</button>
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
