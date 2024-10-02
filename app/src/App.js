import React, { useState } from 'react';

function App() {
  const [screenshotPath, setScreenshotPath] = useState('');

  const handleScreenshot = async () => {
    // Minimize the app and take a screenshot
    await window.electronAPI.minimizeApp();
    const filePath = await window.electronAPI.takeScreenshot();
    setScreenshotPath(filePath);
  };

  return (
    <div className='w-screen h-screen flex items-center justify-center bg-gray-800 text-white text-center'>
      <div>
        <p className='text-xl mb-5'>Nav AI</p>
        <div>
          <input className='w-1/2 rounded-xl p-1 px-2 m-1 text-black' placeholder='Type a task' />
          <button className='bg-gray-600 text-white p-1 px-2 rounded-xl'>Go</button>
        </div>

      </div>
    </div>
  );
}

export default App;
