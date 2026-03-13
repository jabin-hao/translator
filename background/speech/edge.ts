import type { SpeechOptions, SpeechResult } from '~lib/constants/speech';
import { resolveEdgeVoice } from '~lib/constants/speech';

const EDGE_TTS_ENDPOINT =
  'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1' +
  '?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';

const OUTPUT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3';

function escapeSsml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatProsodyRate(speed = 1) {
  const value = Math.round((clamp(speed, 0.5, 2) - 1) * 100);
  return `${value >= 0 ? '+' : ''}${value}%`;
}

function formatProsodyPitch(pitch = 1) {
  const value = Math.round((clamp(pitch, 0.5, 2) - 1) * 50);
  return `${value >= 0 ? '+' : ''}${value}%`;
}

function buildSpeechConfigMessage(timestamp: string) {
  return (
    `X-Timestamp:${timestamp}\r\n` +
    'Content-Type:application/json; charset=utf-8\r\n' +
    'Path:speech.config\r\n\r\n' +
    JSON.stringify({
      context: {
        synthesis: {
          audio: {
            metadataoptions: {
              sentenceBoundaryEnabled: 'false',
              wordBoundaryEnabled: 'false',
            },
            outputFormat: OUTPUT_FORMAT,
          },
        },
      },
    })
  );
}

function buildSsmlMessage(options: SpeechOptions, requestId: string, timestamp: string) {
  const voice = resolveEdgeVoice(options.lang, options.voice);
  const xmlLang = voice.split('-').slice(0, 2).join('-');
  const prosodyRate = formatProsodyRate(options.speed);
  const prosodyPitch = formatProsodyPitch(options.pitch);
  const escapedText = escapeSsml(options.text);

  return (
    `X-RequestId:${requestId}\r\n` +
    'Content-Type:application/ssml+xml\r\n' +
    `X-Timestamp:${timestamp}\r\n` +
    'Path:ssml\r\n\r\n' +
    `<speak version="1.0" xml:lang="${xmlLang}">` +
    `<voice name="${voice}">` +
    `<prosody rate="${prosodyRate}" pitch="${prosodyPitch}">${escapedText}</prosody>` +
    '</voice>' +
    '</speak>'
  );
}

function mergeChunks(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return result.buffer;
}

function extractAudioChunk(data: Uint8Array): Uint8Array | null {
  for (let i = 0; i < data.byteLength - 3; i += 1) {
    if (
      data[i] === 13 &&
      data[i + 1] === 10 &&
      data[i + 2] === 13 &&
      data[i + 3] === 10
    ) {
      const header = new TextDecoder().decode(data.slice(0, i));
      if (!header.includes('Path:audio')) {
        return null;
      }

      return data.slice(i + 4);
    }
  }

  return null;
}

async function toUint8Array(data: Blob | ArrayBuffer | string): Promise<Uint8Array | null> {
  if (typeof data === 'string') {
    return null;
  }

  if (data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer());
  }

  return new Uint8Array(data);
}

export class EdgeSpeechService {
  name = 'edge' as const;
  private socket: WebSocket | null = null;

  async speak(options: SpeechOptions): Promise<SpeechResult> {
    this.stop();

    if (!options.text.trim()) {
      return {
        success: false,
        error: 'Speech text is empty',
      };
    }

    return new Promise<SpeechResult>((resolve) => {
      const requestId = crypto.randomUUID().replace(/-/g, '');
      const timestamp = new Date().toISOString();
      const chunks: Uint8Array[] = [];
      let finished = false;

      const finalize = (result: SpeechResult) => {
        if (finished) {
          return;
        }

        finished = true;
        this.stop();
        resolve(result);
      };

      try {
        const socket = new WebSocket(EDGE_TTS_ENDPOINT);
        socket.binaryType = 'arraybuffer';
        this.socket = socket;

        socket.onopen = () => {
          socket.send(buildSpeechConfigMessage(timestamp));
          socket.send(buildSsmlMessage(options, requestId, timestamp));
        };

        socket.onerror = () => {
          finalize({
            success: false,
            error: 'Edge TTS connection failed',
          });
        };

        socket.onclose = () => {
          if (finished) {
            return;
          }

          finalize({
            success: false,
            error: 'Edge TTS connection closed unexpectedly',
          });
        };

        socket.onmessage = async (event) => {
          if (typeof event.data === 'string') {
            if (event.data.includes('Path:turn.end')) {
              if (chunks.length === 0) {
                finalize({
                  success: false,
                  error: 'Edge TTS returned no audio data',
                });
                return;
              }

              finalize({
                success: true,
                audioData: mergeChunks(chunks),
                audioType: 'audio/mpeg',
              });
            }

            return;
          }

          const frame = await toUint8Array(event.data);
          if (!frame) {
            return;
          }

          const chunk = extractAudioChunk(frame);
          if (chunk && chunk.byteLength > 0) {
            chunks.push(chunk);
          }
        };
      } catch (error) {
        finalize({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  stop(): void {
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // Ignore close errors from stale sockets.
      }
      this.socket = null;
    }
  }
}
