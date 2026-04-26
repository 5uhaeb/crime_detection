import { ImageUp, Loader2, Video } from "lucide-react";
import { useRef, useState } from "react";

export default function UploadBox({
  title,
  description,
  accept,
  previewUrl,
  fileName,
  loading,
  onFile,
  mode = "image",
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const Icon = mode === "video" ? Video : ImageUp;

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    const [file] = event.dataTransfer.files;
    if (file) onFile(file);
  }

  return (
    <section className="panel">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <button
          type="button"
          className="icon-button"
          title="Choose file"
          onClick={() => inputRef.current?.click()}
        >
          <Icon className="h-5 w-5" />
        </button>
      </div>

      <button
        type="button"
        className={`upload-zone ${dragging ? "upload-zone-active" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {previewUrl && mode === "image" ? (
          <img src={previewUrl} alt="Selected upload preview" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <Icon className="h-10 w-10 text-slate-500" />
            <div>
              <p className="font-medium text-slate-900">{fileName || "Drop a file here"}</p>
              <p className="mt-1 text-sm text-slate-500">or click to browse</p>
            </div>
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept={accept}
        onChange={(event) => {
          const [file] = event.target.files;
          if (file) onFile(file);
        }}
      />

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Running inference
        </div>
      )}
    </section>
  );
}
