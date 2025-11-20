// ===============================================================
// Semantic Search System for FreddyMac IDE - RAG Implementation
// ===============================================================

import { fileManager } from './fileUtils';
import axios from 'axios';

// Core Data Structures
export interface CodeChunk {
  id: string;
  content: string;
  filePath: string;
  startLine: number;
  endLine: number;
  chunkIndex: number;
  tokens: number;
  embedding?: number[];
  lastModified: Date;
}

export interface VectorIndex {
  chunks: Map<string, CodeChunk>;
  embeddings: Map<string, number[]>;
  fileHashes: Map<string, string>;
  lastIndexed: Date;
}

export interface RetrievalResult {
  chunk: CodeChunk;
  similarity: number;
  relevanceScore: number;
}

export interface SemanticSearchConfig {
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
  maxRetrievals: number;
  similarityThreshold: number;
  ollamaEndpoint: string;
}

// Main Semantic Search Class
export class SemanticSearchEngine {
  private index: VectorIndex;
  private config: SemanticSearchConfig;
  private isIndexing: boolean = false;

  constructor(config?: Partial<SemanticSearchConfig>) {
    this.config = {
      embeddingModel: 'nomic-embed-text',
      chunkSize: 250,
      chunkOverlap: 50,
      maxRetrievals: 5,
      similarityThreshold: 0.1,
      ollamaEndpoint: 'http://localhost:11434',
      ...config
    };

    this.index = {
      chunks: new Map(),
      embeddings: new Map(),
      fileHashes: new Map(),
      lastIndexed: new Date(0)
    };
  }

  // ===============================================================
  // CORE FUNCTION: Index the entire project
  // ===============================================================
  async embedAndIndexProject(): Promise<{
    success: boolean;
    chunksIndexed: number;
    filesProcessed: number;
    timeTaken: number;
    errors: string[];
  }> {
    if (this.isIndexing) {
      throw new Error('Indexing already in progress');
    }

    const startTime = Date.now();
    this.isIndexing = true;
    const errors: string[] = [];
    let chunksIndexed = 0;
    let filesProcessed = 0;

    try {
      console.log('🔍 Starting semantic indexing of project...');
      
      // Get all project files
      const fileTree = fileManager.getFileTree();
      const codeFiles = this.extractCodeFiles(fileTree);
      
      console.log(`📁 Found ${codeFiles.length} code files to process`);

      // Process each file
      for (const filePath of codeFiles) {
        try {
          const file = fileManager.getFile(filePath);
          if (!file || !file.content) continue;

          // Check if file has changed since last indexing
          const currentHash = this.generateFileHash(file.content);
          const lastHash = this.index.fileHashes.get(filePath);
          
          if (currentHash === lastHash) {
            console.log(`⏭️  Skipping unchanged file: ${filePath}`);
            continue;
          }

          // Chunk the file content
          const chunks = this.chunkCodeFile(file.content, filePath);
          console.log(`📄 Processing ${filePath}: ${chunks.length} chunks`);

          // Generate embeddings for each chunk
          for (const chunk of chunks) {
            try {
              const embedding = await this.generateEmbedding(chunk.content);
              chunk.embedding = embedding;
              
              // Store in index
              this.index.chunks.set(chunk.id, chunk);
              this.index.embeddings.set(chunk.id, embedding);
              
              chunksIndexed++;
            } catch (error: any) {
              errors.push(`Embedding failed for chunk ${chunk.id}: ${error.message}`);
            }
          }

          // Update file hash
          this.index.fileHashes.set(filePath, currentHash);
          filesProcessed++;

        } catch (error: any) {
          errors.push(`File processing failed for ${filePath}: ${error.message}`);
        }
      }

      this.index.lastIndexed = new Date();
      const timeTaken = Date.now() - startTime;
      
      console.log(`✅ Indexing complete: ${chunksIndexed} chunks, ${filesProcessed} files, ${timeTaken}ms`);

      return {
        success: true,
        chunksIndexed,
        filesProcessed,
        timeTaken,
        errors
      };

    } catch (error: any) {
      errors.push(`Critical indexing error: ${error.message}`);
      return {
        success: false,
        chunksIndexed,
        filesProcessed,
        timeTaken: Date.now() - startTime,
        errors
      };
    } finally {
      this.isIndexing = false;
    }
  }

  // ===============================================================
  // CORE FUNCTION: Retrieve relevant context for AI queries
  // ===============================================================
  async retrieveContext(query: string, maxResults?: number): Promise<{
    context: string;
    retrievals: RetrievalResult[];
    totalChunks: number;
  }> {
    const limit = maxResults || this.config.maxRetrievals;
    
    console.log(`🔍 Retrieving context for query: "${query}"`);

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Calculate similarities with all chunks
      const similarities: RetrievalResult[] = [];
      
      for (const [chunkId, chunk] of this.index.chunks.entries()) {
        const chunkEmbedding = this.index.embeddings.get(chunkId);
        if (!chunkEmbedding) continue;
        
        const similarity = this.cosineSimilarity(queryEmbedding, chunkEmbedding);
        
        if (similarity >= this.config.similarityThreshold) {
          similarities.push({
            chunk,
            similarity,
            relevanceScore: similarity // Can be enhanced with additional scoring
          });
        }
      }

      // Sort by relevance and take top results
      const topRetrievals = similarities
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

      // Format context for AI prompt
      const context = this.formatContextForAI(topRetrievals);

      console.log(`📊 Retrieved ${topRetrievals.length} relevant code chunks`);

      return {
        context,
        retrievals: topRetrievals,
        totalChunks: this.index.chunks.size
      };

    } catch (error: any) {
      console.error('Context retrieval failed:', error);
      return {
        context: '',
        retrievals: [],
        totalChunks: this.index.chunks.size
      };
    }
  }

  // ===============================================================
  // MARCUS'S IMPLEMENTATION: Ollama Embedding Integration
  // ===============================================================
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      console.log(`🧠 Generating embedding for text (${text.length} chars)...`);
      
      // Prepare the request to Ollama's embedding endpoint
      const response = await axios.post(
        `${this.config.ollamaEndpoint}/api/embeddings`,
        {
          model: this.config.embeddingModel,
          prompt: text
        },
        {
          timeout: 30000, // 30 second timeout for large texts
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Validate response structure
      if (!response.data) {
        throw new Error('Empty response from Ollama embedding API');
      }

      if (!response.data.embedding || !Array.isArray(response.data.embedding)) {
        throw new Error('Invalid embedding format in Ollama response');
      }

      const embedding = response.data.embedding;
      
      // Validate embedding is array of numbers
      if (embedding.length === 0) {
        throw new Error('Empty embedding vector returned');
      }

      if (!embedding.every((val: any) => typeof val === 'number' && !isNaN(val))) {
        throw new Error('Embedding contains non-numeric values');
      }

      console.log(`✅ Generated ${embedding.length}-dimensional embedding`);
      return embedding;

    } catch (error: any) {
      // Handle specific error types with helpful messages
      if (error.code === 'ECONNREFUSED') {
        throw new Error(
          `Ollama server not running. Please start Ollama first:\n` +
          `  1. Run: ollama serve\n` +
          `  2. Install model: ollama pull ${this.config.embeddingModel}`
        );
      }

      if (error.code === 'ENOTFOUND') {
        throw new Error(
          `Cannot reach Ollama at ${this.config.ollamaEndpoint}. ` +
          `Check if Ollama is running and accessible.`
        );
      }

      if (error.response?.status === 404) {
        throw new Error(
          `Embedding model "${this.config.embeddingModel}" not found. ` +
          `Install it with: ollama pull ${this.config.embeddingModel}`
        );
      }

      if (error.response?.status === 400) {
        throw new Error(
          `Bad request to Ollama API: ${error.response?.data?.error || 'Invalid request format'}`
        );
      }

      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error(
          `Ollama embedding request timed out. The text may be too long or the model is slow.`
        );
      }

      // Generic error fallback
      throw new Error(
        `Ollama embedding API error: ${error.message}\n` +
        `Endpoint: ${this.config.ollamaEndpoint}/api/embeddings\n` +
        `Model: ${this.config.embeddingModel}`
      );
    }
  }

  // ===============================================================
  // UTILITY FUNCTIONS
  // ===============================================================

  private extractCodeFiles(fileTree: any[], basePath = ''): string[] {
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c', '.go', '.rs'];
    const excludePaths = ['node_modules', '.git', 'dist', 'build', '.next'];
    const files: string[] = [];

    for (const node of fileTree) {
      const fullPath = basePath ? `${basePath}/${node.name}` : node.name;
      
      // Skip excluded directories
      if (excludePaths.some(exclude => fullPath.includes(exclude))) {
        continue;
      }

      if (node.type === 'file') {
        const hasCodeExtension = codeExtensions.some(ext => node.name.endsWith(ext));
        if (hasCodeExtension) {
          files.push(fullPath);
        }
      } else if (node.children) {
        files.push(...this.extractCodeFiles(node.children, fullPath));
      }
    }

    return files;
  }

  private generateFileHash(content: string): string {
    // Simple hash function for change detection
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private chunkCodeFile(content: string, filePath: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const lines = content.split('\n');
    const wordsPerLine = 10; // Approximate
    const targetTokens = this.config.chunkSize;
    const overlapTokens = this.config.chunkOverlap;
    
    let currentChunk = '';
    let currentTokens = 0;
    let chunkStartLine = 0;
    let chunkIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineTokens = Math.ceil(line.split(/\s+/).length * 1.3); // Rough tokenization
      
      if (currentTokens + lineTokens > targetTokens && currentChunk.length > 0) {
        // Create chunk
        const chunk: CodeChunk = {
          id: `${filePath}_chunk_${chunkIndex}`,
          content: currentChunk.trim(),
          filePath,
          startLine: chunkStartLine,
          endLine: i - 1,
          chunkIndex,
          tokens: currentTokens,
          lastModified: new Date()
        };
        
        chunks.push(chunk);
        chunkIndex++;
        
        // Start new chunk with overlap
        const overlapLines = Math.ceil(overlapTokens / wordsPerLine);
        const startOverlap = Math.max(0, i - overlapLines);
        currentChunk = lines.slice(startOverlap, i).join('\n') + '\n' + line;
        currentTokens = Math.ceil(currentChunk.split(/\s+/).length * 1.3);
        chunkStartLine = startOverlap;
      } else {
        if (currentChunk.length === 0) {
          chunkStartLine = i;
        }
        currentChunk += line + '\n';
        currentTokens += lineTokens;
      }
    }

    // Add final chunk if there's remaining content
    if (currentChunk.trim().length > 0) {
      const chunk: CodeChunk = {
        id: `${filePath}_chunk_${chunkIndex}`,
        content: currentChunk.trim(),
        filePath,
        startLine: chunkStartLine,
        endLine: lines.length - 1,
        chunkIndex,
        tokens: currentTokens,
        lastModified: new Date()
      };
      chunks.push(chunk);
    }

    return chunks;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vector dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private formatContextForAI(retrievals: RetrievalResult[]): string {
    if (retrievals.length === 0) {
      return '';
    }

    let context = '--- RETRIEVED CODE CONTEXT ---\n';
    
    retrievals.forEach((result, index) => {
      const { chunk, similarity } = result;
      context += `File: ${chunk.filePath} (Chunk ${index + 1}/${retrievals.length}, Similarity: ${similarity.toFixed(3)})\n`;
      context += `Lines ${chunk.startLine}-${chunk.endLine}:\n`;
      context += '"""\n';
      context += chunk.content;
      context += '\n"""\n\n';
    });
    
    context += '--- END CONTEXT ---\n';
    return context;
  }

  // ===============================================================
  // PUBLIC API
  // ===============================================================

  getIndexStats(): {
    totalChunks: number;
    totalFiles: number;
    lastIndexed: Date;
    isIndexing: boolean;
  } {
    return {
      totalChunks: this.index.chunks.size,
      totalFiles: this.index.fileHashes.size,
      lastIndexed: this.index.lastIndexed,
      isIndexing: this.isIndexing
    };
  }

  clearIndex(): void {
    this.index = {
      chunks: new Map(),
      embeddings: new Map(),
      fileHashes: new Map(),
      lastIndexed: new Date(0)
    };
  }

  async forceReindex(): Promise<void> {
    this.clearIndex();
    await this.embedAndIndexProject();
  }
}

// Export singleton instance
export const semanticSearch = new SemanticSearchEngine();


// ===============================================================
// INTEGRATION POINTS FOR AI TEAM
// ===============================================================

/**
 * Enhanced context building function for AI team integration
 * This will be called by aiTeam.ts to provide semantic context
 */
export async function buildEnhancedContext(
  query: string, 
  currentFile?: string
): Promise<string> {
  try {
    const { context } = await semanticSearch.retrieveContext(query);
    
    let enhancedContext = '';
    
    if (context) {
      enhancedContext += context + '\n';
    }
    
    // Add current file context if available
    if (currentFile) {
      const file = fileManager.getFile(currentFile);
      if (file && file.content) {
        enhancedContext += `--- CURRENT FILE CONTEXT ---\n`;
        enhancedContext += `File: ${currentFile}\n`;
        enhancedContext += '"""\n';
        enhancedContext += file.content;
        enhancedContext += '\n"""\n';
        enhancedContext += '--- END CURRENT FILE ---\n\n';
      }
    }
    
    return enhancedContext;
  } catch (error) {
    console.error('Enhanced context building failed:', error);
    return '';
  }
}