# Test Document

This document tests **internal markdown links** functionality.

## Table of Contents

- [Introduction](#introduction)
- [Features to Test](#features-to-test) 
- [Code Examples](#code-examples)
- [List Examples](#list-examples)
- [Conclusion](#conclusion)

## Introduction

This is a test document to verify the **internal linking** functionality. Links like [Introduction](#introduction) should scroll smoothly to the corresponding heading.

## Features to Test

1. **Internal links** - Links with `#` should scroll to headings with matching IDs
2. **External links** - Links without `#` should require cmd/ctrl+click to open
3. **Heading IDs** - Headings should automatically get slugified IDs
4. **Smooth scrolling** - Should scroll smoothly to target headings

Jump to [Code Examples](#code-examples) below.

## Code Examples

```javascript
function testFunction() {
  console.log("Testing the markdown editor!");
}
```

This code block is here for testing. You can jump back to [Features to Test](#features-to-test).

## List Examples

- Item 1
- Item 2
  - Nested item with a link to [Introduction](#introduction)
- Item 3

> This is a blockquote with a link to [Conclusion](#conclusion).

[External link to test](https://example.com) - This should require cmd/ctrl+click.

## Conclusion

*Italic text* and **bold text** for testing.

Back to the [Table of Contents](#table-of-contents) or [Introduction](#introduction).

## My Section!

This heading has special characters that should be handled properly in the slug generation.

Link to [My Section!](#my-section) should work.

## Another Section

More content here to test scrolling.

## Another Section

This is a duplicate heading name - should get a unique ID like `another-section-2`.

Link to the [first Another Section](#another-section) vs [second Another Section](#another-section-2). 