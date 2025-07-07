# Resizable Outline Test

This is a test document to verify that the outline sidebar can be resized by dragging.

## Getting Started

The outline sidebar should appear on the right side of the screen when you click the "Outline" button in the header.

### Resize Handle

You should see a resize handle on the left edge of the outline sidebar. When you hover over it, it should show a blue highlight.

### Dragging to Resize

Click and drag the resize handle to the left to make the outline wider, or to the right to make it narrower.

## Features

The resizable outline sidebar includes several features:

### Minimum and Maximum Width

- **Minimum width**: 200px
- **Maximum width**: 600px

### Persistence

The sidebar width is saved to localStorage and will be remembered when you reload the page.

### Smooth Transitions

The document content smoothly adjusts its margin as you resize the sidebar.

## Technical Details

### Implementation

The resize functionality is implemented using:

1. Mouse event handlers
2. State management with React hooks
3. LocalStorage for persistence
4. CSS transitions for smooth animations

### User Experience

The resize handle provides visual feedback:

- Hover state with blue highlight
- Active state during dragging
- Cursor changes to indicate resize capability

## Conclusion

This resizable outline sidebar enhances the document viewing experience by allowing users to customize the layout to their preferences. 