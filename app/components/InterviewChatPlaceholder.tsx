import React from 'react';
import { ArrowRight, MessageCircle } from 'lucide-react';

const InterviewChatPlaceholder: React.FC = () => (
  <div className="flex-1 flex flex-col overflow-hidden p-3">
    <div className="bg-[#1a1a1a]/80 mb-2 rounded-t border border-[#3a3a3a]">
      <div className="p-2 flex items-center justify-between">
        <h3 className="text-xs font-medium flex items-center gap-1.5">
          <MessageCircle className="h-3 w-3 text-primary" />
          Interview Chat
        </h3>
      </div>
    </div>
    <div className="flex-1 rounded-b border border-[#3a3a3a] bg-[#1a1a1a]/30 p-2">
      <div className="space-y-3">
        {/* Example message */}
        {/* <GeminiMessage text="Hi! I'm your GG Interview assistant. I can see and hear you. Let's practice some coding interview questions!" /> */}
        {/* {messages.map((message, index) => (
          message.type === 'human' ? (
            <HumanMessage key={`msg-${index}`} text={message.text} />
          ) : (
            <GeminiMessage key={`msg-${index}`} text={message.text} />
          )
        ))} */}
      </div>
    </div>
    <div className="pt-3">
      <div className="flex items-center gap-2 bg-[#1a1a1a]/80 rounded p-2 border border-[#3a3a3a]">
        <input
          type="text"
          placeholder="Type your message..."
          className="flex-1 bg-transparent outline-none text-xs text-gray-300"
          disabled
        />
        <button className="text-primary" disabled>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
);

export default InterviewChatPlaceholder;
