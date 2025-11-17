"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ConnectionTest() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testConnections = async () => {
    setTesting(true);
    setTestResults([]);
    
    // Test 1: Backend API
    try {
      addResult("Testing backend API...");
      const response = await fetch('http://localhost:4000/user/profile', {
        credentials: 'include'
      });
      addResult(`Backend API: ${response.ok ? '✅ Connected' : '❌ Failed'}`);
    } catch (error) {
      addResult(`Backend API: ❌ Error - ${error.message}`);
    }

    // Test 2: LiveKit WebSocket
    const urlsToTest = [
      'ws://localhost:7880',
      'ws://127.0.0.1:7880',
      'http://localhost:7880'
    ];

    for (const url of urlsToTest) {
      try {
        addResult(`Testing LiveKit at ${url}...`);
        const ws = new WebSocket(url);
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('Timeout'));
          }, 3000);
          
          ws.onopen = () => {
            clearTimeout(timeout);
            addResult(`${url}: ✅ WebSocket Connected`);
            ws.close();
            resolve(true);
          };
          
          ws.onerror = (error) => {
            clearTimeout(timeout);
            reject(error);
          };
        });
        break;
      } catch (error) {
        addResult(`${url}: ❌ Failed - ${error.message}`);
      }
    }

    // Test 3: Electron API
    if (window.electronAPI) {
      addResult("Electron API: ✅ Available");
      addResult(`Methods: ${Object.keys(window.electronAPI).join(', ')}`);
    } else {
      addResult("Electron API: ❌ Not available (running in browser)");
    }

    // Test 4: Deepfake service
    try {
      addResult("Testing deepfake service...");
      const testBlob = new Blob(['test'], { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', testBlob, 'test.jpg');
      formData.append('userId', 'test');
      formData.append('meetingId', 'test');
      formData.append('participantId', 'test');

      const response = await fetch('http://localhost:4000/deepfake/check', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      addResult(`Deepfake service: ${response.ok ? '✅ Available' : '❌ Failed'}`);
    } catch (error) {
      addResult(`Deepfake service: ❌ Error - ${error.message}`);
    }

    setTesting(false);
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Connection Test</h2>
      
      <Button 
        onClick={testConnections} 
        disabled={testing}
        className="mb-4"
      >
        {testing ? 'Testing...' : 'Run Connection Tests'}
      </Button>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {testResults.map((result, index) => (
          <div 
            key={index} 
            className="text-sm font-mono p-2 bg-gray-100 rounded"
          >
            {result}
          </div>
        ))}
      </div>
    </Card>
  );
}