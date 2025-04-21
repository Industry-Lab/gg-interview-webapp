/**
 * Code Highlighter - Automatically highlights code variables in LeetCode style
 * 
 * This utility finds code elements and applies LeetCode-style formatting to
 * variables like nums1, nums2, m, n, etc.
 */

export function initCodeHighlighter() {
  if (typeof window === 'undefined') return;

  // Variables to highlight
  const variablePatterns = [
    'nums1', 'nums2', 'val', 'm', 'n', 'k', 'target',
    'head', 'tail', 'nodes', 'left', 'right'
  ];

  // Execute when DOM is fully loaded
  window.addEventListener('DOMContentLoaded', function() {
    highlightCodeVariables();
    
    // Use MutationObserver to detect when new content is added to the page
    const observer = new MutationObserver(function(mutations) {
      highlightCodeVariables();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });

  function highlightCodeVariables() {
    // Get all code elements
    const codeElements = document.querySelectorAll('code');
    
    codeElements.forEach(codeElement => {
      // Skip already processed elements
      if (codeElement.dataset.processed === 'true') return;
      
      let html = codeElement.innerHTML;
      
      // Highlight each variable pattern
      variablePatterns.forEach(pattern => {
        // Regular expression to match the variable while preserving word boundaries
        const regex = new RegExp(`\\b(${pattern})\\b`, 'g');
        html = html.replace(regex, `<span class="${pattern}">${pattern}</span>`);
      });
      
      // Update the content and mark as processed
      codeElement.innerHTML = html;
      codeElement.dataset.processed = 'true';
    });
  }
}
