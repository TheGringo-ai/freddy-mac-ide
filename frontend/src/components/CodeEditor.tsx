import React, { useState, useEffect } from 'react';
import { fileManager } from '../utils/fileUtils';
import './CodeEditor.css';

interface CodeEditorProps {
  activeFile: string | null;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ activeFile }) => {
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('typescript');

  useEffect(() => {
    if (activeFile) {
      // Load file content from file manager
      const file = fileManager.getFile(activeFile);
      if (file && file.content !== undefined) {
        setContent(file.content);
      } else {
        setContent('// File not found or empty');
      }
      
      // Set language based on file extension
      const ext = activeFile.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'tsx': case 'ts':
          setLanguage('typescript');
          break;
        case 'js': case 'jsx':
          setLanguage('javascript');
          break;
        case 'css':
          setLanguage('css');
          break;
        case 'json':
          setLanguage('json');
          break;
        case 'md':
          setLanguage('markdown');
          break;
        default:
          setLanguage('text');
      }
    }
  }, [activeFile]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (activeFile) {
      fileManager.updateFile(activeFile, newContent);
    }
  };


  if (!activeFile) {
    return (
      <div className="editor-welcome">
        <div className="welcome-content">
          <h2>FreddyMac IDE</h2>
          <p>Select a file from the explorer to start editing</p>
          <div className="welcome-features">
            <div className="feature">
              <span className="feature-icon">🤖</span>
              <span>AI Terminal with OpenAI/Ollama</span>
            </div>
            <div className="feature">
              <span className="feature-icon">📁</span>
              <span>File Explorer</span>
            </div>
            <div className="feature">
              <span className="feature-icon">⚡</span>
              <span>Fast Development</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="code-editor">
      <div className="editor-header">
        <div className="editor-tabs">
          <div className="editor-tab active">
            <span className="tab-icon">📄</span>
            <span className="tab-name">{activeFile.split('/').pop()}</span>
            <button className="tab-close">×</button>
          </div>
        </div>
      </div>

      <div className="editor-content">
        <div className="editor-gutter">
          {content.split('\n').map((_, index) => (
            <div key={index} className="line-number">
              {index + 1}
            </div>
          ))}
        </div>
        
        <textarea
          className={`editor-textarea ${language}`}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          spellCheck={false}
          placeholder="Start typing..."
        />
      </div>

      <div className="editor-footer">
        <span className="editor-language">{language}</span>
        <span className="editor-position">Ln {content.split('\n').length}, Col 1</span>
      </div>
    </div>
  );
};

export default CodeEditor;