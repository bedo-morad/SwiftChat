# A real file storage service

## What

Replace `FileService` + `FileUtils` (write bytes to local disk, store the absolute path in
`Message.mediaFilePath`, read the whole file back into every response) with a storage abstraction:
a `FileStorage` interface, a local implementation for dev, and an object-store implementation
(S3/MinIO) for anything deployed. Media reaches the client through its own streaming endpoint
instead of being inlined in `MessageResponse`.

## Why

The current implementation is the smallest thing that works, and it has five separate problems:

- **Bytes are inlined in JSON.** `MessageMapper` calls `FileUtils.readFileFromLocation` for every
  message, so `GET /api/v1/messages/chat/{chatId}` loads every media file in the chat into memory
  and base64s it into one response. A chat with thirty photos is a multi-hundred-megabyte payload.
- **Local disk doesn't survive a second instance.** The path only resolves on the machine that
  handled the upload. Two app instances behind a load balancer serve 404s for each other's uploads,
  and a container restart on ephemeral storage loses everything.
- **The DB stores a filesystem path, not a key.** `<media-output-path>/users/<id>/<millis>.<ext>` is
  baked into every row, so moving or renaming the upload directory orphans all existing media.
- **Failures are silent.** `saveFile` returns `null` on a failed `mkdirs` or `IOException`, and
  `readFileFromLocation` returns an empty array. An upload that never landed still saves a `Message`
  and answers 200; the client sees an empty attachment with no explanation.
- **No content-type handling and no ownership check on read.** `uploadMessageMedia` hardcodes
  `MessageType.IMAGE` for any upload, nothing validates the actual bytes, and because media rides
  along inside `MessageResponse` there's no read path where a per-file authorization check could live.

`System.currentTimeMillis()` as the filename is also a collision for two uploads by the same user in
the same millisecond — minor next to the above, but it comes free with the fix.

## When

Before launch, or as soon as the app runs anywhere other than one developer's machine — whichever
comes first. The inlined-bytes problem is the one that bites at any scale, including a demo; the
object-store move only matters once there's more than one instance.

## The change

A key-based interface, with the storage backend chosen by profile:

```java
public interface FileStorage {
    /** @return an opaque storage key to persist on the entity */
    String store(MultipartFile file, String senderId);

    InputStream retrieve(String key);

    void delete(String key);
}
```

Local implementation keeps writing under `media-output-path` but returns a *relative* key
(`users/<senderId>/<uuid>.<ext>`) and resolves it against the configured root on read, so the root
stays movable. The S3 implementation uses the same key as the object key. Both throw a
`FileStorageException` instead of returning `null`, so a failed upload never produces a `Message`.

Then drop `media` from `MessageResponse` and serve the bytes on their own:

```java
@GetMapping("/{messageId}/media")
public ResponseEntity<Resource> downloadMedia(@PathVariable Long messageId,
                                              Authentication authentication);
```

The endpoint checks the caller is the sender or recipient of that message, sets the stored
content type, and streams the body. `MessageResponse` carries a `mediaUrl` pointing at it.

Two things worth folding in while touching this code:

- Detect the real type on upload (`Files.probeContentType` or Tika on the leading bytes) to set
  `MessageType` and reject anything not in an allowlist, rather than trusting the extension or
  hardcoding `IMAGE`.
- Persist the detected content type on `Message` so the download endpoint doesn't have to re-sniff.

## Note

`FileStorage.delete` has no caller until message deletion exists. It belongs in the interface anyway
— an object store makes orphaned media a billing line, so whatever cleans up messages later will
need it.
