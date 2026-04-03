import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useEditorSync } from '../src/hooks/useEditorSync';

/**
 * CollaborativeEditor Component
 * 
 * Monaco Editor integration for real-time collaborative code editing.
 * 
 * Key Features:
 * - Real-time code synchronization with debounced updates
 * - Remote cursor rendering with player name tags
 * - Language selection (host-only)
 * - Run/Submit code execution with visual feedback
 * - Output panel with zoom controls
 * - Read-only mode for voted-out players
 * 
 * Architecture:
 * - Uses useEditorSync hook for WebSocket communication
 * - Monaco Content Widgets for remote cursor visualization
 * - pushEditOperations for conflict-free remote updates
 */

interface CursorPosition {
  cursorOffset: number;
  selection: {
    startOffset: number;
    endOffset: number;
  };
}

interface CursorData {
  playerId: string;
  playerName: string;
  color: string;
  cursorOffset: number;
  selection: {
    startOffset: number;
    endOffset: number;
  };
}

interface OutputResult {
  caseIndex: number
  passed: boolean
  status: string
  input: string
  actualOutput: string
  stderr: string
}

interface CollaborativeEditorProps {
  roomCode: string;
  language: string;
  initialCode?: string;
  socket: any;
  socketId: string;
  lockedPlayers?: string[];
  isHost?: boolean;
  onLanguageChange?: (language: string) => void;
  onRun?: () => void
  onSubmit?: () => void
  isRunning?: boolean
  isSubmitting?: boolean
  outputResults?: OutputResult[] | null
  outputError?: string | null
  submittingPlayerName?: string | null
  submittingPlayerColor?: string | null
  submitSummary?: {
    totalPassed: number;
    totalFailed: number;
    totalCases: number;
  } | null;
}

const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  roomCode,
  language,
  initialCode = '',
  socket,
  socketId,
  lockedPlayers = [],
  isHost = false,
  onLanguageChange,
  onRun,
  onSubmit,
  isRunning = false,
  isSubmitting = false,
  outputResults = null,
  outputError = null,
  submittingPlayerName = null,
  submittingPlayerColor = null,
  submitSummary = null
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  
  /** Flag to prevent emitting local changes when applying remote updates. */
  const isRemoteUpdate = useRef<boolean>(false);
  
  const decorationsRef = useRef<string[]>([]);
  
  /** Map of player IDs to their Monaco Content Widget instances. */
  const cursorWidgetsRef = useRef<Map<string, any>>(new Map());
  
  const [outputZoom, setOutputZoom] = useState(100);
  
  const { remoteCode, remoteCursors, isReadOnly, error, emitCodeUpdate, emitCursorUpdate } = useEditorSync({
    socket,
    roomCode,
    socketId,
    lockedPlayers
  });
  
  /**
   * Update Monaco editor language when prop changes.
   * 
   * Note: Changing the language does NOT remount the editor (key={roomCode}),
   * it only updates the model language for syntax highlighting.
   */
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current.editor.setModelLanguage(model, language);
      }
    }
  }, [language]);
  
  // Handle editor content changes
  const handleEditorChange = (value: string | undefined) => {
    if (isRemoteUpdate.current || !value) return;
    
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!model) return;
    
    const position = editor.getPosition();
    const selection = editor.getSelection();
    
    if (!position) return;
    
    const cursorOffset = model.getOffsetAt(position);
    const startOffset = selection ? model.getOffsetAt(selection.getStartPosition()) : cursorOffset;
    const endOffset = selection ? model.getOffsetAt(selection.getEndPosition()) : cursorOffset;
    
    emitCodeUpdate(value, {
      cursorOffset,
      selection: { startOffset, endOffset }
    });
  };
  
  /**
   * Apply remote code updates using Monaco's executeEdits API.
   * 
   * Why executeEdits instead of setValue?
   * - Preserves local cursor position and selection
   * - Maintains undo history stack
   * - Prevents editor flicker/reset on remote updates
   * 
   * @see https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.ITextModel.html#pushEditOperations
   */
  useEffect(() => {
    if (!remoteCode || !editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    const currentValue = model.getValue();
    if (currentValue === remoteCode) return;

    isRemoteUpdate.current = true;

    // Save cursor position before edit
    const position = editor.getPosition();

    // Use executeEdits instead of setValue — preserves cursor position
    model.pushEditOperations(
      [],
      [
        {
          range: model.getFullModelRange(),
          text: remoteCode,
        },
      ],
      () => position ? [{ selectionStartLineNumber: position.lineNumber, selectionStartColumn: position.column, positionLineNumber: position.lineNumber, positionColumn: position.column }] : null
    );

    // Restore cursor after edit
    if (position) {
      editor.setPosition(position);
    }

    isRemoteUpdate.current = false;
  }, [remoteCode]);
  
  /**
   * Track local cursor position changes and broadcast to other players.
   * 
   * Debouncing not applied here as cursor updates need to feel real-time;
   * network layer handles batching via Socket.io's internal buffering.
   */
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    
    const handleCursorPositionChange = (e: any) => {
      if (isRemoteUpdate.current || isReadOnly) return;
      
      const model = editor.getModel();
      if (!model) return;
      
      const offset = model.getOffsetAt(e.position);
      const selection = editor.getSelection();
      const startOffset = selection ? model.getOffsetAt(selection.getStartPosition()) : offset;
      const endOffset = selection ? model.getOffsetAt(selection.getEndPosition()) : offset;
      
      emitCursorUpdate({
        cursorOffset: offset,
        selection: { startOffset, endOffset }
      });
    };
    
    const disposable = editor.onDidChangeCursorPosition(handleCursorPositionChange);
    
    return () => {
      disposable.dispose();
    };
  }, [emitCursorUpdate, isReadOnly]);

  /** Update editor read-only state when player is voted out. */
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ readOnly: isReadOnly });
    }
  }, [isReadOnly]);

  /**
   * Render remote player cursors using Monaco Content Widgets.
   * 
   * Each remote cursor consists of:
   * 1. A blinking vertical bar (CSS animation)
   * 2. A name tag floating above showing player name
   * 
   * Widgets are recreated on every cursor position update to ensure
   * position accuracy. Cleanup handles players leaving mid-session.
   */
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const currentPlayerIds = new Set(Object.keys(remoteCursors));

    // Remove widgets for players who left
    cursorWidgetsRef.current.forEach((widget, playerId) => {
      if (!currentPlayerIds.has(playerId)) {
        editor.removeContentWidget(widget);
        cursorWidgetsRef.current.delete(playerId);
      }
    });

    // Add or update widget for each remote cursor
    Object.values(remoteCursors).forEach((cursor: CursorData) => {
      const model = editor.getModel();
      if (!model) return;

      const position = model.getPositionAt(cursor.cursorOffset);

      // Build the DOM element for this cursor
      const widgetDomNode = document.createElement('div');
      widgetDomNode.style.cssText = `
        position: absolute;
        pointer-events: none;
        z-index: 100;
      `;

      // Vertical cursor bar
      const bar = document.createElement('div');
      bar.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 2px;
        height: 1.4em;
        background-color: ${cursor.color};
        animation: collab-blink 1s step-start infinite;
      `;

      // Name tag above the bar
      const tag = document.createElement('div');
      tag.textContent = cursor.playerName;
      tag.style.cssText = `
        position: absolute;
        top: -18px;
        left: 0px;
        background-color: ${cursor.color};
        color: #000;
        font-size: 9px;
        font-family: monospace;
        font-weight: bold;
        padding: 1px 5px;
        white-space: nowrap;
        border-radius: 2px;
        line-height: 14px;
      `;

      widgetDomNode.appendChild(bar);
      widgetDomNode.appendChild(tag);

      // Create the content widget
      const widget = {
        getId: () => `remote-cursor-${cursor.playerId}`,
        getDomNode: () => widgetDomNode,
        getPosition: () => ({
          position: {
            lineNumber: position.lineNumber,
            column: position.column
          },
          preference: [
            monaco.editor.ContentWidgetPositionPreference.EXACT
          ]
        })
      };

      // Remove old widget for this player if exists
      const existing = cursorWidgetsRef.current.get(cursor.playerId);
      if (existing) {
        editor.removeContentWidget(existing);
      }

      // Add updated widget
      editor.addContentWidget(widget);
      cursorWidgetsRef.current.set(cursor.playerId, widget);
    });

    return () => {
      // Cleanup on unmount
      cursorWidgetsRef.current.forEach((widget) => {
        editor.removeContentWidget(widget);
      });
      cursorWidgetsRef.current.clear();
    };
  }, [remoteCursors]);

  /** Add CSS keyframe animation for remote cursor blinking. */
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'collab-blink-style';
    const existing = document.getElementById('collab-blink-style');
    if (existing) existing.remove();
    style.textContent = `
      @keyframes collab-blink {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById('collab-blink-style');
      if (el) el.remove();
    };
  }, []);

  /** Cleanup all widgets on unmount to prevent memory leaks. */
  useEffect(() => {
    return () => {
      const editor = editorRef.current;
      if (!editor) return;
      cursorWidgetsRef.current.forEach((widget) => {
        editor.removeContentWidget(widget);
      });
      cursorWidgetsRef.current.clear();
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 text-center">
          <h3 className="text-xl font-bold mb-2">Editor Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full w-full flex flex-col">
      {/* Language Header */}
      <div className="bg-[#2d2d2d] border-b-2 border-black px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-gray-400 text-xs font-mono">LANGUAGE:</span>
          <span className="text-cyan-400 text-sm font-bold font-mono uppercase">{language}</span>
        </div>
        
        {/* Language Selector - Host Only */}
        {isHost && onLanguageChange && (
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 text-xs font-mono">CHANGE:</span>
            <select 
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              title="Change programming language"
              className="bg-[#1a1a1a] border-2 border-black px-2 py-1 text-xs font-mono focus:outline-none focus:border-[#55a039] hover:border-[#55a039] cursor-pointer text-cyan-400"
            >
              <option value="python" className="bg-[#1a1a1a] text-cyan-400">Python</option>
              <option value="javascript" className="bg-[#1a1a1a] text-cyan-400">JavaScript</option>
              <option value="java" className="bg-[#1a1a1a] text-cyan-400">Java</option>
              <option value="cpp" className="bg-[#1a1a1a] text-cyan-400">C++</option>
              <option value="csharp" className="bg-[#1a1a1a] text-cyan-400">C#</option>
            </select>
          </div>
        )}
        
        {isReadOnly && (
          <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
            VOTED OUT
          </div>
        )}
      </div>
      
      {/* Monaco Editor — 65% of remaining height */}
      <div className="flex-[65] min-h-0">
        <Editor
          key={roomCode} // Remount only when room changes, not on language change
          height="100%"
          language={language}
          theme="vs-dark"
          defaultValue={initialCode}
          onChange={handleEditorChange}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;
          }}
          options={{
            readOnly: isReadOnly,
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            lineNumbers: 'on',
            folding: false,
            renderLineHighlight: 'none',
            occurrencesHighlight: false,
            renderWhitespace: 'selection',
            smoothScrolling: true,
            cursorBlinking: true,
            cursorSmoothCaretAnimation: true
          }}
        />
      </div>

      {/* Run / Submit Button Bar */}
      <div className="shrink-0 bg-[#252525] border-t-2 border-b-2 border-[#333] px-4 py-2 flex items-center gap-3">
        {/* RUN button */}
        <button
          onClick={onRun}
          disabled={isRunning || isSubmitting || !onRun}
          className={`px-5 py-2 font-['Press_Start_2P'] text-[10px] border-4 border-black
            border-b-4 border-r-4 active:border-b-2 active:border-r-2
            active:translate-y-0.5 active:translate-x-0.5 transition-all
            ${isRunning || isSubmitting || !onRun
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed border-gray-800'
              : 'bg-[#00ffff] text-black hover:bg-cyan-300'
            }`}
        >
          {isRunning ? '⏳ RUNNING...' : '▶ RUN'}
        </button>

        {/* SUBMIT button */}
        <button
          onClick={onSubmit}
          disabled={isRunning || isSubmitting || !onSubmit}
          className={`px-5 py-2 font-['Press_Start_2P'] text-[10px] border-4 border-black
            border-b-4 border-r-4 active:border-b-2 active:border-r-2
            active:translate-y-0.5 active:translate-x-0.5 transition-all
            ${isRunning || isSubmitting || !onSubmit
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed border-gray-800'
              : 'bg-[#55a039] text-white hover:bg-green-600'
            }`}
        >
          {isSubmitting ? '⏳ SUBMITTING...' : 'SUBMIT'}
        </button>

        {/* Submitting indicator for other players */}
        {isSubmitting && submittingPlayerName && (
          <span
            className="text-xs font-mono animate-pulse ml-2"
            style={{ color: submittingPlayerColor || '#ffffff' }}
          >
            {submittingPlayerName} is submitting...
          </span>
        )}

        {/* Output Zoom Controls — right side */}
        <div className="ml-auto flex items-center space-x-2">
          <button
            onClick={() => setOutputZoom(prev => Math.max(prev - 10, 80))}
            disabled={outputZoom <= 80}
            className="px-2 py-1 bg-gray-700 text-white text-xs border-2 border-black hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            -
          </button>
          <span className="text-xs text-white font-mono">{outputZoom}%</span>
          <button
            onClick={() => setOutputZoom(prev => Math.min(prev + 10, 150))}
            disabled={outputZoom >= 150}
            className="px-2 py-1 bg-gray-700 text-white text-xs border-2 border-black hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>
      </div>

      {/* Output Panel — 35% of remaining height */}
      <div className="flex-[35] min-h-0 flex flex-col bg-[#1e1e1e] border-t border-[#333]">
        {/* Output Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-[#252525] border-b border-[#333]">
          <span className="text-gray-400 text-xs font-mono uppercase tracking-wider">
            Output
          </span>
          {outputResults && (
            <span className={`text-xs font-mono font-bold ${
              outputResults.every(r => r.passed) ? 'text-green-400' : 'text-red-400'
            }`}>
              {outputResults.filter(r => r.passed).length}/{outputResults.length} passed
            </span>
          )}
        </div>

        {/* Output Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ zoom: outputZoom / 100 }}>
          {/* Default state */}
          {!outputResults && !isRunning && !isSubmitting && !outputError && (
            <div className="text-gray-500 text-xs font-mono text-center py-6">
              Click RUN to test · SUBMIT to check for win
            </div>
          )}

          {/* Running / Submitting state */}
          {(isRunning || isSubmitting) && (
            <div className="text-yellow-400 text-xs font-mono text-center py-6 animate-pulse">
              ⚡ Executing code against test cases...
            </div>
          )}

          {/* Error state */}
          {outputError && !isRunning && !isSubmitting && (
            <div className="text-red-400 text-xs font-mono p-3 bg-red-900/20 border border-red-600 rounded">
              ❌ {outputError}
            </div>
          )}

          {/* Results */}
          {outputResults && !isRunning && !isSubmitting && outputResults.map((result, index) => (
            <div
              key={index}
              className={`border rounded p-2 text-xs font-mono ${
                result.passed
                  ? 'border-green-700 bg-green-900/20'
                  : 'border-red-700 bg-red-900/20'
              }`}
            >
              {/* Case header */}
              <div className="flex items-center gap-2 mb-1">
                <span>{result.passed ? '✅' : '❌'}</span>
                <span className="text-gray-300 font-bold">Case {index + 1}</span>
                <span className={`ml-auto text-[10px] px-1 rounded ${
                  result.passed ? 'text-green-400' : 'text-red-400'
                }`}>
                  {result.status}
                </span>
              </div>

              {/* Input */}
              <div className="text-gray-500 mb-0.5">
                Input: <span className="text-gray-300">{result.input}</span>
              </div>

              {/* Actual output (only show if failed) */}
              {!result.passed && result.actualOutput && (
                <div className="text-gray-500 mb-0.5">
                  Got: <span className="text-red-300">{result.actualOutput}</span>
                </div>
              )}

              {/* Stderr / compile error */}
              {result.stderr && (
                <div className="mt-1 text-red-400 whitespace-pre-wrap text-[10px] bg-black/30 p-1 rounded">
                  {result.stderr}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Submit Summary */}
        {submitSummary && (
          <div className="mt-3 p-2 border-2 border-black bg-[#1a1a1a]">
            <div className="font-['Press_Start_2P'] text-[8px] mb-2 text-gray-400">SUBMISSION SUMMARY</div>
            <div className={`text-xs font-mono ${submitSummary.totalFailed === 0 ? 'text-[#00ff00]' : 'text-red-400'}`}>
              {submitSummary.totalPassed} / {submitSummary.totalCases} test cases passed
            </div>
            {submitSummary.totalFailed > 0 && (
              <div className="text-red-400 text-[10px] font-mono mt-1">
                {submitSummary.totalFailed} case{submitSummary.totalFailed > 1 ? 's' : ''} failed
                {submitSummary.totalCases > (outputResults?.length ?? 0) && (
                  <span className="text-gray-500">
                    {' '}(includes {submitSummary.totalCases - (outputResults?.length ?? 0)} hidden case{submitSummary.totalCases - (outputResults?.length ?? 0) > 1 ? 's' : ''})
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollaborativeEditor;
