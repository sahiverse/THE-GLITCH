
import React, { useState } from 'react';

interface CodeEditorProps {
  onRun?: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ onRun }) => {
  const [code, setCode] = useState(`def has_cycle(head):
    if not head:
        return False
    
    slow = head
    fast = head
    
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        
        if slow == fast:
            return True
            
    return False`);

  const [isExecuting, setIsExecuting] = useState(false);
  const [lastOutput, setLastOutput] = useState("Python environment initialized. Ready for deployment.");

  // Problem description
  const problemDescription = `Given the head of a linked list, determine if the linked list has a cycle in it.

There is a cycle in a linked list if there is some node in the list that can be reached again by continuously following the next pointer. Internally, pos is used to denote the index of the node that tail's next pointer is connected to. Note that pos is not passed as a parameter.

Return true if there is a cycle in the linked list. Otherwise, return false.`;

  const constraints = `\n• The number of the nodes in the list is in the range [0, 10^4].\n• -10^5 <= Node.val <= 10^5\n• pos is -1 or a valid index in the linked-list.`;

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
  };

  const handleRun = () => {
    if (isExecuting) return;
    
    setIsExecuting(true);
    setLastOutput("Analyzing source... Initializing Python interpreter...");
    
    setTimeout(() => {
      setLastOutput("Running pytest suite... 0x4F2A");
      setTimeout(() => {
        setIsExecuting(false);
        setLastOutput("Execution successful. 2/4 test cases passed.");
        if (onRun) onRun();
      }, 800);
    }, 600);
  };

  const lineCount = code.split('\n').length;

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center space-x-1">
          <span className="text-[10px] text-gray-500 font-['Press_Start_2P']">FILE: main.py</span>
        </div>
        <div className="text-[10px] text-gray-400 uppercase">
          {isExecuting ? 'STATUS: EXECUTING...' : `LAST SAVED: ${new Date().toLocaleTimeString()}`}
        </div>
      </div>

      <div className="flex-1 relative bg-black border-[12px] border-[#333] crt-screen overflow-hidden flex flex-col">
        {/* CRT Scanline Effect */}
        <div className="scanline"></div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Line Numbers Sidebar */}
          <div className="bg-[#111] border-r border-[#333] p-4 text-[#555] font-vt text-xl text-right select-none min-w-[50px] z-10">
            {Array.from({ length: Math.max(lineCount, 20) }).map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Editable Terminal Content */}
          <div className="relative flex-1 z-10 flex flex-col overflow-hidden">
            <div className="p-2 opacity-50 text-[8px] font-['Press_Start_2P'] text-[#00ff00] bg-[#111] border-b border-[#333] flex justify-between items-center">
              <span>GLITCH-OS v1.0.4 - PYTHON 3.10 READY</span>
              {isExecuting && <span className="animate-pulse">RUNNING...</span>}
            </div>
            
            <textarea
              value={code}
              onChange={handleCodeChange}
              spellCheck={false}
              disabled={isExecuting}
              className={`flex-1 w-full bg-transparent text-[#00ff00] font-vt text-2xl p-4 outline-none resize-none selection:bg-[#00ff0033] selection:text-white caret-[#00ff00] transition-opacity ${isExecuting ? 'opacity-70' : 'opacity-100'}`}
              placeholder="# Enter your Python logic here..."
            />
          </div>
        </div>
        
        {/* Bottom Panel with Log and Run Button */}
        <div className="relative z-20 p-4 bg-[#111] border-t-4 border-[#333] flex items-center space-x-4">
          <div className="flex-1 font-vt text-[#00ff00]">
            <div className="text-white text-[10px] font-['Press_Start_2P'] mb-1 opacity-70">[STDOUT / STDERR]</div>
            <div className="flex items-center text-lg">
              <span className="mr-2 animate-pulse">&gt;</span>
              <span className={isExecuting ? 'text-yellow-400' : ''}>{lastOutput}</span>
            </div>
          </div>
          
          <button 
            onClick={handleRun}
            disabled={isExecuting}
            className={`
              px-6 py-3 font-['Press_Start_2P'] text-[12px] 
              border-4 border-black border-b-8 border-r-8 
              active:border-b-4 active:border-r-4 active:translate-y-1 active:translate-x-1 
              transition-all flex items-center space-x-2
              ${isExecuting 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed border-gray-800' 
                : 'bg-[#00ffff] text-black hover:bg-cyan-400'}
            `}
          >
            <span>{isExecuting ? '...' : '▶'}</span>
            <span>RUN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
