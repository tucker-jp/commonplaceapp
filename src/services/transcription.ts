import { openai, MODELS } from "@/lib/openai";

export async function transcribeAudio(audioFile: File): Promise<string> {
  try {
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: MODELS.TRANSCRIPTION,
      response_format: "text",
    });

    return response;
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error("Failed to transcribe audio");
  }
}

// For server-side use with Buffer
export async function transcribeAudioBuffer(
  audioBuffer: Buffer,
  filename: string = "audio.webm"
): Promise<string> {
  try {
    // Create a File-like object from Buffer using Uint8Array
    const uint8Array = new Uint8Array(audioBuffer);
    const file = new File([uint8Array], filename, {
      type: "audio/webm",
    });

    const response = await openai.audio.transcriptions.create({
      file: file,
      model: MODELS.TRANSCRIPTION,
      response_format: "text",
    });

    return response;
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error("Failed to transcribe audio");
  }
}
