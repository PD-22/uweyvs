const ytdl = require('@distube/ytdl-core');

getCaptions(
    'https://www.youtube.com/watch?v=GpI68hQ3acM',
    '',
    'vtt'
).then(console.log);

/**
 * @param {string} url
 * @param {string} language
 * @param {'xml' | 'ttml' | 'vtt' | 'srv1' | 'srv2' | 'srv3'} format
 */
async function getCaptions(url, language, format = 'xml') {
    try {
        const info = await ytdl.getInfo(url)

        const trackList = info
            .player_response
            .captions
            .playerCaptionsTracklistRenderer
            .captionTracks;
        if (!trackList?.length)
            throw new Error(`Invalid trackList: "${trackList}"`);

        const targetTrack = trackList
            .find(track => !language || track.languageCode === language)
        if (!targetTrack)
            throw new Error(`Invalid targetTrack: "${targetTrack}"`);

        const captionUrl = targetTrack.baseUrl;
        if (!captionUrl)
            throw new Error(`Invalid captionUrl: "${captionUrl}"`);

        const response = await fetch(`${captionUrl}&fmt=${format}`);

        return response.text();
    } catch (error) {
        console.error(`Failed to get captions from: "${url}"`, error);
    }
}
