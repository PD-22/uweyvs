'use client';

import { useState } from "react";

const initUrl = 'https://www.youtube.com/watch?v=GpI68hQ3acM';

export default function Home() {
  const [url, setUrl] = useState(initUrl);
  const [subtitles, setSubtitles] = useState('');

  return (
    <div className="p-2">
      <div className="flex flex-row gap-2 max-sm:flex-col sm:max-w-xl">
        <input
          className="bg-foreground text-background w-full px-2 py-1"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v="
        />
        <button
          autoFocus
          className="bg-foreground text-background px-2 py-1 whitespace-nowrap"
          onClick={async () => {
            try {
              setSubtitles('Loading...');
              const res = await fetch(`/try?url=${url}`, {
                next: { revalidate: 10 },
              });
              const { data } = await res.json();
              console.log(data);
              const newSubtitles = `${data}`;
              if (!newSubtitles)
                throw new Error(`Invalid subtitles "${newSubtitles}"`);
              setSubtitles(newSubtitles);
            } catch (error) {
              console.error(error);
              setSubtitles('Error');
            }
          }}
        >
          Extract Subtitles
        </button>
      </div>
      <hr className="my-3" />
      <pre>{subtitles}</pre>
    </div>
  );
}
