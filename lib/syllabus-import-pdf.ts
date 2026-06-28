export async function extractPdfText(url: string): Promise<string> {
  const { getDocumentProxy, extractText } = await import("unpdf");
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}
