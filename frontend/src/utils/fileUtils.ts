export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  content?: string;
  children?: FileNode[];
  size?: number;
  lastModified?: Date;
}

export class FileManager {
  public files: Map<string, FileNode> = new Map();
  private listeners: Set<() => void> = new Set();

  addListener(callback: () => void) {
    this.listeners.add(callback);
  }

  removeListener(callback: () => void) {
    this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback());
  }

  public refresh() {
    this.notifyListeners();
  }

  async importFiles(fileList: FileList): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      promises.push(this.addFile(file));
    }
    
    await Promise.all(promises);
    this.notifyListeners();
  }

  async importDirectory(files: FileList): Promise<void> {
    const dirStructure = new Map<string, FileNode>();
    
    // Process all files and build directory structure
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await this.processFileForDirectory(file, dirStructure);
    }
    
    // Merge into main file map
    dirStructure.forEach((node, path) => {
      this.files.set(path, node);
    });
    
    this.notifyListeners();
  }

  private async addFile(file: File): Promise<void> {
    const content = await this.readFileContent(file);
    const path = `/${file.name}`;
    
    const fileNode: FileNode = {
      name: file.name,
      path,
      type: 'file',
      content,
      size: file.size,
      lastModified: new Date(file.lastModified)
    };
    
    this.files.set(path, fileNode);
  }

  private async processFileForDirectory(file: File, dirMap: Map<string, FileNode>): Promise<void> {
    const relativePath = (file as any).webkitRelativePath || file.name;
    const pathParts = relativePath.split('/');
    const fullPath = `/${relativePath}`;
    
    // Create directory nodes for each part of the path
    let currentPath = '';
    for (let i = 0; i < pathParts.length - 1; i++) {
      currentPath += `/${pathParts[i]}`;
      
      if (!dirMap.has(currentPath)) {
        dirMap.set(currentPath, {
          name: pathParts[i],
          path: currentPath,
          type: 'directory',
          children: []
        });
      }
    }
    
    // Add the file
    const content = await this.readFileContent(file);
    const fileNode: FileNode = {
      name: pathParts[pathParts.length - 1],
      path: fullPath,
      type: 'file',
      content,
      size: file.size,
      lastModified: new Date(file.lastModified)
    };
    
    dirMap.set(fullPath, fileNode);
  }

  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        resolve(e.target?.result as string || '');
      };
      
      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };
      
      // Read as text for code files, you could add binary support later
      if (this.isTextFile(file.name)) {
        reader.readAsText(file);
      } else {
        resolve(`[Binary file: ${file.name}]`);
      }
    });
  }

  private isTextFile(filename: string): boolean {
    const textExtensions = [
      'txt', 'md', 'js', 'ts', 'jsx', 'tsx', 'css', 'scss', 'sass',
      'html', 'htm', 'xml', 'json', 'yml', 'yaml', 'py', 'java',
      'c', 'cpp', 'h', 'hpp', 'cs', 'php', 'rb', 'go', 'rs', 'swift'
    ];
    
    const ext = filename.split('.').pop()?.toLowerCase();
    return textExtensions.includes(ext || '');
  }

  getFileTree(): FileNode[] {
    const rootItems: FileNode[] = [];
    const directories = new Map<string, FileNode>();
    
    // First pass: create all directories
    this.files.forEach((node, path) => {
      if (node.type === 'directory') {
        directories.set(path, { ...node, children: [] });
      }
    });
    
    // Second pass: organize files and directories
    this.files.forEach((node, path) => {
      const pathParts = path.split('/').filter(p => p);
      
      if (pathParts.length === 1) {
        // Root level item
        if (node.type === 'directory') {
          rootItems.push(directories.get(path) || node);
        } else {
          rootItems.push(node);
        }
      } else {
        // Nested item - find parent directory
        const parentPath = '/' + pathParts.slice(0, -1).join('/');
        const parentDir = directories.get(parentPath);
        
        if (parentDir && parentDir.children) {
          if (node.type === 'directory') {
            parentDir.children.push(directories.get(path) || node);
          } else {
            parentDir.children.push(node);
          }
        }
      }
    });
    
    return rootItems;
  }

  getFile(path: string): FileNode | null {
    return this.files.get(path) || null;
  }

  updateFile(path: string, content: string): void {
    const file = this.files.get(path);
    if (file && file.type === 'file') {
      file.content = content;
      file.lastModified = new Date();
      this.notifyListeners();
    }
  }

  deleteFile(path: string): void {
    this.files.delete(path);
    this.notifyListeners();
  }

  createNewFile(name: string, path?: string): void {
    const fullPath = path ? `${path}/${name}` : `/${name}`;
    
    const newFile: FileNode = {
      name,
      path: fullPath,
      type: 'file',
      content: this.getDefaultContent(name),
      lastModified: new Date()
    };
    
    this.files.set(fullPath, newFile);
    this.notifyListeners();
  }

  private getDefaultContent(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'js':
        return `// ${filename}
console.log('Hello from ${filename}');
`;
      case 'ts':
        return `// ${filename}
console.log('Hello from ${filename}');

export {};
`;
      case 'tsx':
        return `import React from 'react';

interface Props {}

const ${filename.replace('.tsx', '')}: React.FC<Props> = () => {
  return (
    <div>
      <h1>Hello from ${filename}</h1>
    </div>
  );
};

export default ${filename.replace('.tsx', '')};
`;
      case 'css':
        return `/* ${filename} */
.container {
  padding: 20px;
  font-family: Arial, sans-serif;
}
`;
      case 'html':
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${filename.replace('.html', '')}</title>
</head>
<body>
  <h1>Hello World</h1>
</body>
</html>
`;
      case 'md':
        return `# ${filename.replace('.md', '')}

This is a new markdown file.

## Getting Started

Write your content here...
`;
      case 'json':
        return `{
  "name": "${filename.replace('.json', '')}",
  "version": "1.0.0"
}
`;
      default:
        return `// ${filename}
// New file created in FreddyMac IDE
`;
    }
  }

  exportFile(path: string): void {
    const file = this.files.get(path);
    if (!file || file.type !== 'file') return;
    
    const blob = new Blob([file.content || ''], { 
      type: this.getMimeType(file.name) 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async exportDirectory(path: string): Promise<void> {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    
    // Add all files in directory to zip
    this.files.forEach((node, nodePath) => {
      if (nodePath.startsWith(path) && node.type === 'file' && node.content) {
        const relativePath = nodePath.replace(path, '').replace(/^\//, '');
        if (relativePath) {
          zip.file(relativePath, node.content);
        }
      }
    });
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${path.split('/').pop() || 'directory'}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'js': 'application/javascript',
      'ts': 'application/typescript',
      'tsx': 'application/typescript',
      'jsx': 'application/javascript',
      'css': 'text/css',
      'html': 'text/html',
      'json': 'application/json',
      'md': 'text/markdown',
      'txt': 'text/plain',
      'py': 'text/x-python',
      'java': 'text/x-java-source',
    };
    
    return mimeTypes[ext || ''] || 'text/plain';
  }
}

// Global file manager instance
export const fileManager = new FileManager();

// Initialize with some default files
fileManager.files.set('/README.md', {
  name: 'README.md',
  path: '/README.md',
  type: 'file',
  content: `# FreddyMac IDE

Welcome to your AI-powered IDE!

## Features

🤖 **AI Terminal** - Chat with OpenAI or Ollama models
📁 **File Management** - Drag & drop files and directories
💾 **Export** - Download files or export directories as ZIP
⚡ **Live Editing** - Real-time code editing with auto-save

## Getting Started

1. **Import files**: Drag files from your computer into the file explorer
2. **Create files**: Use the + buttons in the explorer header
3. **AI Chat**: Use the terminal at the bottom - try typing \`ai hello\`
4. **Export**: Click 💾 on any file or folder to download

Happy coding! 🚀
`,
  lastModified: new Date()
});

fileManager.files.set('/src/example.js', {
  name: 'example.js',
  path: '/src/example.js',
  type: 'file',
  content: `// Example JavaScript file
console.log('Welcome to FreddyMac IDE!');

function greet(name) {
  return \`Hello, \${name}! Ready to code?\`;
}

// Try the AI terminal below!
// Type: ai explain this code
console.log(greet('Developer'));
`,
  lastModified: new Date()
});

fileManager.files.set('/src', {
  name: 'src',
  path: '/src',
  type: 'directory',
  children: []
});

// Force refresh to build proper tree structure
setTimeout(() => {
  fileManager.refresh();
}, 100);

fileManager.files.set('/package.json', {
  name: 'package.json',
  path: '/package.json',
  type: 'file',
  content: `{
  "name": "freddy-mac-project",
  "version": "1.0.0",
  "description": "A project created in FreddyMac IDE",
  "main": "src/example.js",
  "scripts": {
    "start": "node src/example.js",
    "dev": "nodemon src/example.js"
  },
  "dependencies": {},
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
`,
  lastModified: new Date()
});