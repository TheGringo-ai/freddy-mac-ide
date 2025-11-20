import React, { useState, useEffect, useRef } from 'react';
import { fileManager, type FileNode } from '../utils/fileUtils';
import './FileExplorer.css';

interface FileExplorerProps {
  onFileSelect: (filePath: string) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ onFileSelect }) => {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load initial file tree
    loadFileTree();
    
    // Listen for file manager updates
    const handleFileUpdate = () => {
      loadFileTree();
    };
    
    fileManager.addListener(handleFileUpdate);
    
    return () => {
      fileManager.removeListener(handleFileUpdate);
    };
  }, []);

  const loadFileTree = () => {
    const tree = fileManager.getFileTree();
    setFileTree(tree);
  };

  const toggleDirectory = (path: string) => {
    setExpandedDirs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // Check if any file has a webkitRelativePath (directory upload)
      const hasDirectories = Array.from(files).some(file => 
        (file as any).webkitRelativePath
      );

      if (hasDirectories) {
        await fileManager.importDirectory(files);
      } else {
        await fileManager.importFiles(files);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      await fileManager.importFiles(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDirUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      await fileManager.importDirectory(files);
    }
    if (dirInputRef.current) {
      dirInputRef.current.value = '';
    }
  };

  const handleNewFile = () => {
    const fileName = prompt('Enter file name (e.g., script.js, style.css):');
    if (fileName && fileName.trim()) {
      fileManager.createNewFile(fileName.trim());
      // Auto-open the new file
      setTimeout(() => {
        onFileSelect(`/${fileName.trim()}`);
      }, 100);
    }
  };

  const handleFileAction = (node: FileNode, action: 'open' | 'export' | 'delete') => {
    switch (action) {
      case 'open':
        if (node.type === 'file') {
          onFileSelect(node.path);
        } else {
          toggleDirectory(node.path);
        }
        break;
      case 'export':
        if (node.type === 'file') {
          fileManager.exportFile(node.path);
        } else {
          fileManager.exportDirectory(node.path);
        }
        break;
      case 'delete':
        if (window.confirm(`Delete ${node.name}?`)) {
          fileManager.deleteFile(node.path);
        }
        break;
    }
  };

  const getFileIcon = (fileName: string, type: string) => {
    if (type === 'directory') return '📁';
    
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx': case 'ts': return '⚛️';
      case 'js': case 'jsx': return '📜';
      case 'css': return '🎨';
      case 'json': return '⚙️';
      case 'md': return '📝';
      default: return '📄';
    }
  };

  const renderFileNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedDirs.has(node.path);
    const indent = depth * 16;

    return (
      <div key={node.path}>
        <div 
          className={`file-item ${node.type}`}
          style={{ paddingLeft: `${indent}px` }}
          onClick={() => handleFileAction(node, 'open')}
          onContextMenu={(e) => {
            e.preventDefault();
            // Right-click context menu could be added here
          }}
        >
          <div className="file-main">
            <span className="file-icon">
              {node.type === 'directory' ? (isExpanded ? '📂' : '📁') : getFileIcon(node.name, node.type)}
            </span>
            <span className="file-name">{node.name}</span>
          </div>
          <div className="file-actions">
            <button
              className="action-btn export"
              onClick={(e) => {
                e.stopPropagation();
                handleFileAction(node, 'export');
              }}
              title={node.type === 'directory' ? 'Export as ZIP' : 'Download file'}
            >
              💾
            </button>
            <button
              className="action-btn delete"
              onClick={(e) => {
                e.stopPropagation();
                handleFileAction(node, 'delete');
              }}
              title="Delete"
            >
              🗑️
            </button>
          </div>
        </div>
        
        {node.type === 'directory' && isExpanded && node.children && (
          <div className="file-children">
            {node.children.map(child => renderFileNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="file-explorer">
      <div className="explorer-header">
        <span className="explorer-title">Explorer</span>
        <div className="explorer-actions">
          <button
            className="action-btn"
            onClick={handleNewFile}
            title="New File"
          >
            📄+
          </button>
          <button
            className="action-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Upload Files"
          >
            📁+
          </button>
          <button
            className="action-btn"
            onClick={() => dirInputRef.current?.click()}
            title="Upload Directory"
          >
            📂+
          </button>
        </div>
      </div>
      
      <div 
        className={`explorer-content ${isDragging ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="drop-overlay">
            <div className="drop-message">
              <div className="drop-icon">📁</div>
              <div>Drop files or folders here</div>
            </div>
          </div>
        )}
        
        {fileTree.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <div className="empty-text">No files yet</div>
            <div className="empty-subtext">Drag & drop files or use the + buttons</div>
          </div>
        ) : (
          fileTree.map(node => renderFileNode(node))
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
      <input
        ref={dirInputRef}
        type="file"
        multiple
        // @ts-ignore - webkitdirectory is not in TypeScript types yet
        webkitdirectory=""
        style={{ display: 'none' }}
        onChange={handleDirUpload}
      />
    </div>
  );
};

export default FileExplorer;