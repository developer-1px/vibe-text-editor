# Rich Text Editor Core

This is a core library for a rich text editor that does not rely on the `contenteditable` attribute.

## Motivation

The standard DOM APIs for handling ranges and selections (like `Range` and `Selection`) have some inconvenient behaviors, especially when dealing with block-level elements or custom components that should be treated as a single atomic unit. For example, it's difficult to treat an `<hr>` tag or a custom widget as a single "character" that a user can select or move across.

This library aims to provide an editor core with an API that is familiar to web developers (mimicking the DOM API) but abstracts away these complexities.

## Key Features

- **`contenteditable`-free:** Manages all user input and rendering manually for full control over the editor's behavior.
- **DOM-like API:** Provides classes like `Editor`, `EditorRange`, and `EditorSelection` that are analogous to their native DOM counterparts.
- **Atomic Elements:** Allows treating specific elements (like `<hr>`, `<img>`, or custom components) as single, indivisible characters within the editor's content. This simplifies selection and manipulation logic. For instance, in an `EditorRange`, you can set the start or end of a range right before or after an element with a simple offset of `0` or `1`.
