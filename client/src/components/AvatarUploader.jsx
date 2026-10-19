/*import { useState, useRef } from "react";
import apiClient from "../services/apiClient.js";

// ─────────────────────────────────────────────────────────────────────────────
// TODO Task 1: Drag-and-drop
//   - add onDragOver / onDragLeave / onDrop handlers to the drop zone
//   - call e.preventDefault() in onDragOver AND onDrop
//   - read the dropped file from e.dataTransfer.files[0]
//   - toggle an `isDragging` state to apply the "dragging" class
//
// TODO Task 2: Client-side validation
//   - before uploading, check file.type is an allowed image type
//   - and file.size <= 5 * 1024 * 1024 (5MB)
//   - show an error and stop if invalid
//
// TODO Task 3: Local preview
//   - const url = URL.createObjectURL(file); use it as <img src>
//   - revoke it with URL.revokeObjectURL in a useEffect cleanup
//
// TODO Task 4: Axios upload with progress
//   - build FormData, append the file under the name "avatar"
//   - apiClient.post("/api/upload", formData, { onUploadProgress: ... })
//   - percent = Math.round((event.loaded * 100) / event.total)
//   - DO NOT set a Content-Type header
// ─────────────────────────────────────────────────────────────────────────────

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function AvatarUploader() {
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  // Stub upload - replace with FormData + Axios onUploadProgress (Task 4).
  async function upload() {
    if (!file) return;
    console.log("TODO: upload", file.name);
  }

  return (
    <div>
      <div className="drop-zone" onClick={() => inputRef.current.click()}>
        <p>Drag an image here, or click to choose</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => setFile(e.target.files[0])}
        />
      </div>

      <button onClick={upload} disabled={!file}>Upload</button>
    </div>
  );
}
*/



import { useState, useRef, useEffect } from "react";
import apiClient from "../services/apiClient.js";

const MAX_SIZE = 5 * 1024 * 1024;

const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export default function AvatarUploader() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");

  const inputRef = useRef(null);

  // Validate the selected file and create its preview.
  function handleFile(selectedFile) {
    if (!selectedFile) return;

    setError("");
    setUploadedUrl("");
    setProgress(0);

    if (!ALLOWED.includes(selectedFile.type)) {
      setFile(null);
      setPreview(null);
      setError("Please select a JPEG, PNG, WebP, or GIF image.");
      return;
    }

    if (selectedFile.size > MAX_SIZE) {
      setFile(null);
      setPreview(null);
      setError("Image size must not exceed 5MB.");
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  }

  // Release the preview URL when it changes or the component unmounts.
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // Drag-and-drop handlers.
  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    handleFile(droppedFile);
  }

  // File picker handler.
  function handleChange(e) {
    handleFile(e.target.files[0]);

    // Allow choosing the same file again.
    e.target.value = "";
  }

  // Upload the image using FormData and Axios.
  async function upload() {
    if (!file || uploading) return;

    setError("");
    setProgress(0);
    setUploadedUrl("");
    setUploading(true);

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await apiClient.post(
        "/api/upload",
        formData,
        {
          onUploadProgress: (event) => {
            if (event.total) {
              const percent = Math.round(
                (event.loaded * 100) / event.total
              );

              setProgress(percent);
            }
          },
        }
      );

      setProgress(100);

      const returnedUrl = response.data.url;

      if (!returnedUrl) {
        throw new Error(
          "Upload succeeded, but the server did not return a URL."
        );
      }

      // Keep absolute URLs unchanged. Resolve relative URLs
      // against the Express server's configured base URL.
      const baseURL = apiClient.defaults.baseURL;

      const fullUrl = /^https?:\/\//i.test(returnedUrl)
        ? returnedUrl
        : new URL(
            returnedUrl,
            baseURL
              ? new URL(baseURL, window.location.origin).origin
              : window.location.origin
          ).href;

      setUploadedUrl(fullUrl);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h1>Upload your avatar</h1>

      <div
        className={`drop-zone ${isDragging ? "dragging" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p>
          {isDragging
            ? "Drop your image here"
            : "Drag an image here, or click to choose"}
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={handleChange}
        />
      </div>

      {preview && (
        <div className="preview">
          <img
            src={preview}
            alt="Selected avatar preview"
            style={{
              maxWidth: "200px",
              maxHeight: "200px",
              objectFit: "contain",
            }}
          />

          <p>{file?.name}</p>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <button
        onClick={upload}
        disabled={!file || uploading}
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {(uploading || progress > 0) && (
        <>
          <div
            className="bar"
            role="progressbar"
            aria-label="Upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            style={{
              width: "100%",
              height: "10px",
              background: "#ddd",
              marginTop: "12px",
              overflow: "hidden",
              borderRadius: "8px",
            }}
          >
            <div
              className="fill"
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "#2563eb",
                transition: "width 0.2s",
              }}
            />
          </div>

          <p>{progress}% uploaded</p>
        </>
      )}

      {uploadedUrl && (
        <p>
          Upload successful!{" "}
          <a
            href={uploadedUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View uploaded image
          </a>
        </p>
      )}
    </div>
  );
}
