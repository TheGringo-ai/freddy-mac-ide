// ===============================================================
// Code Diff Processor - Git Unified Diff Implementation
// Implements precise, safe code modifications using patch format
// ===============================================================

// Enhanced action interface for precise code modifications
export interface CodeDiffAction {
  type: 'CODE_DIFF';
  filePath: string;
  diff: string;
  explanation: string;
  safetyLevel: 'safe' | 'caution' | 'review';
  lineRange?: {
    start: number;
    end: number;
  };
}

export interface DiffResult {
  success: boolean;
  newContent?: string;
  error?: string;
  appliedHunks: number;
  totalHunks: number;
  warnings: string[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'remove' | 'add';
  content: string;
  originalNumber?: number;
}

// ===============================================================
// LISA'S IMPLEMENTATION: Precise Code Diff Processing
// ===============================================================

export class CodeDiffProcessor {
  private static readonly MAX_CONTEXT_LINES = 3;
  private static readonly MAX_HUNK_SIZE = 100;

  /**
   * Apply a Git Unified Diff to original content
   * This is safer than replacing entire files as it:
   * 1. Validates that the original context matches
   * 2. Only modifies specific lines that need changing
   * 3. Preserves the rest of the file unchanged
   * 4. Provides clear error messages if the patch cannot be applied
   */
  static applyCodeDiff(originalContent: string, diffString: string): DiffResult {
    const warnings: string[] = [];
    let appliedHunks = 0;
    let totalHunks = 0;

    try {
      // Parse the diff string into structured hunks
      const parseResult = this.parseDiff(diffString);
      if (!parseResult.success) {
        return {
          success: false,
          error: parseResult.error,
          appliedHunks: 0,
          totalHunks: 0,
          warnings: []
        };
      }

      const hunks = parseResult.hunks!;
      totalHunks = hunks.length;
      
      if (totalHunks === 0) {
        return {
          success: false,
          error: 'No valid hunks found in diff',
          appliedHunks: 0,
          totalHunks: 0,
          warnings: []
        };
      }

      // Split original content into lines for processing
      const originalLines = originalContent.split('\n');
      let resultLines = [...originalLines];
      let lineOffset = 0; // Track line number shifts due to insertions/deletions

      // Apply each hunk in order
      for (const hunk of hunks) {
        try {
          const hunkResult = this.applyHunk(resultLines, hunk, lineOffset);
          
          if (hunkResult.success) {
            resultLines = hunkResult.newLines!;
            lineOffset += hunkResult.lineOffset!;
            appliedHunks++;
          } else {
            warnings.push(`Hunk ${appliedHunks + 1} failed: ${hunkResult.error}`);
            
            // If a hunk fails, we can't safely continue
            return {
              success: false,
              error: `Failed to apply hunk ${appliedHunks + 1}: ${hunkResult.error}`,
              appliedHunks,
              totalHunks,
              warnings
            };
          }
        } catch (error: any) {
          return {
            success: false,
            error: `Hunk ${appliedHunks + 1} processing error: ${error.message}`,
            appliedHunks,
            totalHunks,
            warnings
          };
        }
      }

      return {
        success: true,
        newContent: resultLines.join('\n'),
        appliedHunks,
        totalHunks,
        warnings
      };

    } catch (error: any) {
      return {
        success: false,
        error: `Diff processing failed: ${error.message}`,
        appliedHunks,
        totalHunks,
        warnings
      };
    }
  }

  /**
   * Parse a Git Unified Diff string into structured hunks
   */
  private static parseDiff(diffString: string): {
    success: boolean;
    hunks?: DiffHunk[];
    error?: string;
  } {
    try {
      const lines = diffString.split('\n');
      const hunks: DiffHunk[] = [];
      
      let i = 0;
      
      // Skip header lines (---, +++)
      while (i < lines.length) {
        const line = lines[i];
        
        if (line.startsWith('---')) {
          // Original file header - skip
        } else if (line.startsWith('+++')) {
          // New file header - skip
        } else if (line.startsWith('@@')) {
          // Hunk header - parse and process hunk
          const hunkResult = this.parseHunk(lines, i);
          if (hunkResult.success) {
            hunks.push(hunkResult.hunk!);
            i = hunkResult.nextIndex!;
            continue;
          } else {
            return {
              success: false,
              error: `Invalid hunk at line ${i + 1}: ${hunkResult.error}`
            };
          }
        }
        
        i++;
      }

      return {
        success: true,
        hunks
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Diff parsing failed: ${error.message}`
      };
    }
  }

  /**
   * Parse a single hunk from the diff
   */
  private static parseHunk(lines: string[], startIndex: number): {
    success: boolean;
    hunk?: DiffHunk;
    nextIndex?: number;
    error?: string;
  } {
    try {
      const hunkHeader = lines[startIndex];
      
      // Parse hunk header: @@ -oldStart,oldLines +newStart,newLines @@
      const headerMatch = hunkHeader.match(/^@@\s+-?(\d+)(?:,(\d+))?\s+\+?(\d+)(?:,(\d+))?\s+@@/);
      if (!headerMatch) {
        return {
          success: false,
          error: `Invalid hunk header format: ${hunkHeader}`
        };
      }

      const oldStart = parseInt(headerMatch[1]);
      const oldLines = headerMatch[2] ? parseInt(headerMatch[2]) : 1;
      const newStart = parseInt(headerMatch[3]);
      const newLines = headerMatch[4] ? parseInt(headerMatch[4]) : 1;

      // Validate hunk size limits
      if (oldLines > this.MAX_HUNK_SIZE || newLines > this.MAX_HUNK_SIZE) {
        return {
          success: false,
          error: `Hunk too large (${Math.max(oldLines, newLines)} lines, max ${this.MAX_HUNK_SIZE})`
        };
      }

      const hunkLines: DiffLine[] = [];
      let i = startIndex + 1;
      let expectedLines = Math.max(oldLines, newLines) + 10; // Allow some context
      
      while (i < lines.length && hunkLines.length < expectedLines) {
        const line = lines[i];
        
        // Check if we've reached the next hunk or end
        if (line.startsWith('@@') || line.startsWith('---') || line.startsWith('+++')) {
          break;
        }

        // Empty line or no prefix = context line
        if (line === '' || (!line.startsWith(' ') && !line.startsWith('-') && !line.startsWith('+'))) {
          hunkLines.push({
            type: 'context',
            content: line
          });
        } else {
          // Parse diff line
          const prefix = line.charAt(0);
          const content = line.substring(1);
          
          switch (prefix) {
            case ' ':
              hunkLines.push({
                type: 'context',
                content
              });
              break;
            case '-':
              hunkLines.push({
                type: 'remove',
                content
              });
              break;
            case '+':
              hunkLines.push({
                type: 'add',
                content
              });
              break;
            default:
              // Unknown prefix - treat as context line
              hunkLines.push({
                type: 'context',
                content: line
              });
              break;
          }
        }
        
        i++;
      }

      return {
        success: true,
        hunk: {
          oldStart,
          oldLines,
          newStart,
          newLines,
          lines: hunkLines
        },
        nextIndex: i
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Hunk parsing failed: ${error.message}`
      };
    }
  }

  /**
   * Apply a single hunk to the content
   */
  private static applyHunk(originalLines: string[], hunk: DiffHunk, currentOffset: number): {
    success: boolean;
    newLines?: string[];
    lineOffset?: number;
    error?: string;
  } {
    try {
      const adjustedOldStart = hunk.oldStart + currentOffset - 1; // Convert to 0-based index
      const resultLines = [...originalLines];
      let linesDelta = 0; // Track how many lines we've added/removed
      
      // Validate that we can apply this hunk
      if (adjustedOldStart < 0 || adjustedOldStart >= originalLines.length) {
        return {
          success: false,
          error: `Hunk start line ${adjustedOldStart + 1} is outside file bounds (1-${originalLines.length})`
        };
      }

      // Find context lines to validate the hunk applies correctly
      const contextValidation = this.validateHunkContext(originalLines, hunk, adjustedOldStart);
      if (!contextValidation.success) {
        return {
          success: false,
          error: `Context validation failed: ${contextValidation.error}`
        };
      }

      // Apply the hunk line by line
      let originalIndex = adjustedOldStart;
      let hunkIndex = 0;
      
      while (hunkIndex < hunk.lines.length) {
        const diffLine = hunk.lines[hunkIndex];
        
        switch (diffLine.type) {
          case 'context':
            // Context lines should match - just move forward
            if (originalIndex < originalLines.length) {
              originalIndex++;
            }
            break;
            
          case 'remove':
            // Remove the line
            if (originalIndex < resultLines.length) {
              resultLines.splice(originalIndex, 1);
              linesDelta--;
            }
            // Don't increment originalIndex since we removed a line
            break;
            
          case 'add':
            // Add the new line
            resultLines.splice(originalIndex, 0, diffLine.content);
            linesDelta++;
            originalIndex++;
            break;
        }
        
        hunkIndex++;
      }

      return {
        success: true,
        newLines: resultLines,
        lineOffset: linesDelta
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Hunk application failed: ${error.message}`
      };
    }
  }

  /**
   * Validate that the hunk context matches the original file
   */
  private static validateHunkContext(originalLines: string[], hunk: DiffHunk, startIndex: number): {
    success: boolean;
    error?: string;
  } {
    try {
      let originalIndex = startIndex;
      const contextLines = hunk.lines.filter(line => line.type === 'context' || line.type === 'remove');
      
      for (const diffLine of contextLines) {
        if (originalIndex >= originalLines.length) {
          return {
            success: false,
            error: `Hunk extends beyond end of file`
          };
        }
        
        const originalLine = originalLines[originalIndex];
        
        // For context and remove lines, the content should match
        if (diffLine.type === 'context' || diffLine.type === 'remove') {
          if (originalLine.trim() !== diffLine.content.trim()) {
            return {
              success: false,
              error: `Line ${originalIndex + 1} doesn't match expected content. Expected: "${diffLine.content.trim()}", Got: "${originalLine.trim()}"`
            };
          }
        }
        
        originalIndex++;
      }
      
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: `Context validation error: ${error.message}`
      };
    }
  }

  /**
   * Generate a simple diff for code changes (for AI to use as reference)
   */
  static generateDiff(originalContent: string, newContent: string, filePath: string): string {
    const originalLines = originalContent.split('\n');
    const newLines = newContent.split('\n');
    
    let diff = `--- a/${filePath}\n`;
    diff += `+++ b/${filePath}\n`;
    
    // Simple line-by-line diff (can be enhanced with proper LCS algorithm)
    const maxLines = Math.max(originalLines.length, newLines.length);
    let changeStart = -1;
    let changeEnd = -1;
    
    // Find the range of changes
    for (let i = 0; i < maxLines; i++) {
      const oldLine = originalLines[i] || '';
      const newLine = newLines[i] || '';
      
      if (oldLine !== newLine) {
        if (changeStart === -1) changeStart = i;
        changeEnd = i;
      }
    }
    
    if (changeStart === -1) {
      // No changes
      return diff;
    }
    
    // Add context around changes
    const contextStart = Math.max(0, changeStart - this.MAX_CONTEXT_LINES);
    const contextEnd = Math.min(maxLines - 1, changeEnd + this.MAX_CONTEXT_LINES);
    
    const oldCount = contextEnd - contextStart + 1;
    const newCount = contextEnd - contextStart + 1;
    
    diff += `@@ -${contextStart + 1},${oldCount} +${contextStart + 1},${newCount} @@\n`;
    
    for (let i = contextStart; i <= contextEnd; i++) {
      const oldLine = originalLines[i];
      const newLine = newLines[i];
      
      if (oldLine === newLine) {
        diff += ` ${oldLine || ''}\n`;
      } else {
        if (oldLine !== undefined) {
          diff += `-${oldLine}\n`;
        }
        if (newLine !== undefined) {
          diff += `+${newLine}\n`;
        }
      }
    }
    
    return diff;
  }

  /**
   * Validate that a diff is safe to apply
   */
  static validateDiffSafety(diffString: string): {
    safe: boolean;
    level: 'safe' | 'caution' | 'review';
    issues: string[];
  } {
    const issues: string[] = [];
    let level: 'safe' | 'caution' | 'review' = 'safe';
    
    try {
      const lines = diffString.split('\n');
      let addedLines = 0;
      let removedLines = 0;
      let totalHunks = 0;
      
      for (const line of lines) {
        if (line.startsWith('@@')) {
          totalHunks++;
        } else if (line.startsWith('+') && !line.startsWith('+++')) {
          addedLines++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          removedLines++;
        }
        
        // Check for potentially dangerous patterns
        if (line.includes('eval(') || line.includes('exec(')) {
          issues.push('Contains potentially dangerous code execution');
          level = 'review';
        }
        
        if (line.includes('rm -rf') || line.includes('DELETE FROM')) {
          issues.push('Contains potentially destructive operations');
          level = 'review';
        }
      }
      
      // Large diffs should be reviewed
      if (totalHunks > 5 || addedLines + removedLines > 50) {
        issues.push('Large diff - consider manual review');
        level = level === 'safe' ? 'caution' : level;
      }
      
      return {
        safe: level !== 'review',
        level,
        issues
      };
    } catch (error: any) {
      return {
        safe: false,
        level: 'review',
        issues: [`Diff validation failed: ${error.message}`]
      };
    }
  }
}

