# Document Viewer Feature Test

This document tests the three newly implemented features.

## Word Count Feature

This paragraph contains exactly twenty-five words to test the word counting functionality. Try selecting this text to see the selection word count feature in action.

## Outline Code Block Fix

The outline should **NOT** include the headers from the code block below:

```markdown
# This Header Should NOT Appear in Outline
## This Should Also Be Hidden
### And This Too
```

But it **SHOULD** include these real headers:

### Real Header 1
This is a real section with some content.

### Real Header 2
This is another real section.

## Code Examples

Here's another code block with headers that should be ignored:

```bash
#!/bin/bash
# This is a comment, not a header
echo "# This looks like a header but isn't"
```

And here's some inline code that might contain `# fake headers` that should also be ignored.

## File Path Display

The header should now show:
- The complete file path (when available)
- Word count for the entire document
- Word count for selected text when you make a selection

## Test Instructions

1. **Outline Test**: Open the outline sidebar and verify that headers inside code blocks (like "This Header Should NOT Appear in Outline") are not listed
2. **Word Count Test**: Check that the word count displays in the header and updates when you select text
3. **File Path Test**: Verify that the file name/path is displayed properly in the header

Total words in this document: approximately 200+ words. 