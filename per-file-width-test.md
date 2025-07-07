# Per-File Width Preference Test

This document helps test the new per-file width preference memory feature.

## Testing Steps

1. **First File Test**
   - Open this file in the document viewer
   - Toggle to Full Width mode using the toolbar button
   - Close the file (or open a different file)

2. **Second File Test**
   - Open a different document (e.g., README.md or test.md)
   - Verify it opens in Document Width mode (default)
   - Toggle it to a different width preference than the first file

3. **Persistence Test**
   - Switch back to this file
   - Verify it remembers Full Width mode
   - Switch to the second file
   - Verify it remembers its width preference

4. **Session Persistence**
   - Close and reopen the app
   - Open this file again
   - Verify it still opens in Full Width mode

## Technical Details

The implementation stores width preferences per file in localStorage:
- Key: `documentViewerFilePrefs`
- Structure: JSON object with file names as keys
- Each file stores: `widthMode` and `lastModified`
- Automatically cleans up after 50 files (keeps most recent)

## Migration Notes

For existing users:
- The global width preference is migrated to `documentViewerDefaultWidth`
- This serves as the default for files that haven't been opened yet
- Each file remembers its individual preference once opened

---

Try toggling between this file and others to see the per-file memory in action! 