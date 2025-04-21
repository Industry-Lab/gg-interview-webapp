'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import LeetCodeProblemSelector from '../components/LeetCodeProblemSelector';
import CameraPreview from '../components/CameraPreview';

export default function InterviewerLeetCodePage() {
  const [activeTab, setActiveTab] = useState('problem-selector');

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Gemini Interviewer with LeetCode</h1>
      
      <Tabs defaultValue="problem-selector" className="mb-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger 
            value="problem-selector" 
            onClick={() => setActiveTab('problem-selector')}>
            Problem Selector
          </TabsTrigger>
          <TabsTrigger 
            value="interviewer" 
            onClick={() => setActiveTab('interviewer')}>
            Interviewer
          </TabsTrigger>
        </TabsList>
        

        <TabsContent value="interviewer" className="p-4 border rounded-lg">
          <CameraPreview onTranscription={(text) => console.log('Transcription:', text)} />
        </TabsContent>
      </Tabs>
      
      <div className="bg-gray-50 p-4 rounded-lg mt-8">
        <h2 className="text-xl font-semibold mb-2">How to Use</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Select a LeetCode problem from the Problem Selector tab</li>
          <li>Switch to the Interviewer tab to start your interview session</li>
          <li>Enable your camera and microphone</li>
          <li>Discuss the problem with the Gemini AI interviewer</li>
          <li>Use the code editor to solve the problem while receiving guidance</li>
        </ol>
      </div>
    </div>
  );
}
