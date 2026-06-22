export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function filesToDataUrls(files: FileList | File[]): Promise<string[]> {
  return Promise.all(Array.from(files).map(fileToDataUrl));
}